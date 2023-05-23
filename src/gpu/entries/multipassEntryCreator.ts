import { workgroupSize } from "../params";

/**
 * Creates and executes multipass pipeline. 
 * Assumes that the result buffer of each pass is the input buffer of the next pass.
 * 
 * @param gpu Device to run passes on
 * @param passes Code to run on each pass. Order of list is respected.
 */
export const multipassEntryCreator = async (passes: IGPUExecution[], entryInfo: IEntryInfo): Promise<Uint32Array> => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const gpu = (await getDevice())!;
  
  const commandEncoder = gpu.createCommandEncoder();

  let previousResultBuffer: GPUBuffer | undefined;
  for (let i = 0; i < passes.length; i++) {
    const execution = passes[i];

    const inputData = execution.gpuInput;
    const resultData = execution.gpuOutput;
    const shaderModule = gpu.createShaderModule({ code: execution.shader.code });

    // Create input buffers
    const inputBuffers: GPUBuffer[] = [];
    for (let i = 0; i < inputData.inputBufferTypes.length; i++) {
      const mappedInput = inputData.mappedInputs?.get(i);
      if (mappedInput) {
        const inputBuffer = gpu.createBuffer({
          mappedAtCreation: true,
          size: inputData.inputBufferSizes[i],
          usage: inputData.inputBufferUsages[i]
        });
        const arrayBufferInput = inputBuffer.getMappedRange();
        new Uint32Array(arrayBufferInput).set(mappedInput);
        inputBuffer.unmap();
        inputBuffers.push(inputBuffer);
      } else {
        const inputBuffer = gpu.createBuffer({
          size: inputData.inputBufferSizes[i],
          usage: inputData.inputBufferUsages[i]
        });
        inputBuffers.push(inputBuffer);
      }
    }

    // Create result buffer
    const resultBuffer = gpu.createBuffer({
      size: resultData.resultBufferSize,
      usage: resultData.resultBufferUsage
    });

    // Create bind group layout
    const bindGroupLayout = createBindGroupLayout(gpu, inputBuffers, inputData.inputBufferTypes);

    // Create bind group
    const bindGroup = createBindGroup(gpu, bindGroupLayout, inputBuffers, resultBuffer);

    // Create pipeline
    const pipeline = gpu.createComputePipeline({
      layout: gpu.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: {
        module: shaderModule,
        entryPoint: execution.shader.entryPoint
      }
    });

    // Copy previous result buffer to input buffer
    if (previousResultBuffer != undefined) {
      commandEncoder.copyBufferToBuffer(
        previousResultBuffer,
        0,
        inputBuffers[0],
        0,
        inputData.inputBufferSizes[0]
      );
    }

    // Run compute pass
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(entryInfo.numInputs / workgroupSize));
    passEncoder.end();

    previousResultBuffer = resultBuffer;
  }

  // Create buffer to read result
  const gpuReadBuffer = gpu.createBuffer({
    size: entryInfo.outputSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  
  if (previousResultBuffer) {
    commandEncoder.copyBufferToBuffer(
      previousResultBuffer,
      0,
      gpuReadBuffer,
      0,
      entryInfo.outputSize
    );
  }

  const gpuCommands = commandEncoder.finish();
  gpu.queue.submit([gpuCommands]);

  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = gpuReadBuffer.getMappedRange();
  const result = new Uint32Array(arrayBuffer.slice(0));
  gpuReadBuffer.unmap();
  
  return result;
}

/**
 * Description of gpu inputs.
 * 
 * Expected that inputTypes and inputSizes are the same length.
 * mappedInputs should be a map of input index to Uint32Array.
 */
export interface IGPUInput {
  inputBufferTypes: GPUBufferBindingType[];
  inputBufferSizes: number[];
  inputBufferUsages: number[];
  mappedInputs?: Map<number, Uint32Array>;
}

/**
 * Descriptior of gpu result buffer
 */
export interface IGPUResult {
  resultBufferType: GPUBufferBindingType;
  resultBufferSize: number;
  resultBufferUsage: number;
}

export interface IShaderCode {
  code: string;
  entryPoint: string;
}

interface IGPUExecution {
  shader: IShaderCode;
  executionCount: number;
  gpuInput: IGPUInput;
  gpuOutput: IGPUResult;
}

export class GPUExecution implements IGPUExecution {
  shader: IShaderCode;
  gpuInput: IGPUInput;
  gpuOutput: IGPUResult;
  executionCount: number;


  constructor(shader: IShaderCode, gpuInput: IGPUInput, gpuOutput: IGPUResult, executionCount = 1) {
    this.shader = shader;
    this.gpuInput = gpuInput;
    this.gpuOutput = gpuOutput;
    this.executionCount = executionCount;
  }
}

export interface IEntryInfo {
  numInputs: number;
  outputSize: number;
}

// Currently has the assumption that input buffers are in order of binding
// Also assumes that the result buffer will always be of type "storage"
const createBindGroupLayout = (device: GPUDevice, gpuInputBuffers: GPUBuffer[], types: GPUBufferBindingType[]) => {
  // Bind group layout and bind group
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < gpuInputBuffers.length; i++) {
    layoutEntries.push({
      binding: i,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: types[i]
      }
    });
  }

  const resultLayoutEntry: GPUBindGroupLayoutEntry = {
    binding: gpuInputBuffers.length,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
      type: "storage"
    }
  };

  layoutEntries.push(resultLayoutEntry);

  const layout = { entries: layoutEntries };

  return device.createBindGroupLayout(layout);
};

const createBindGroup = (device: GPUDevice, bindGroupLayout: GPUBindGroupLayout, gpuInputBuffers: GPUBuffer[], gpuOutputBuffer: GPUBuffer) => {
  const entriesToBind = gpuInputBuffers.map((gpuInputBuffer, i) => {
    return {
      binding: i,
      resource: {
        buffer: gpuInputBuffer
      }
    };
  });

  entriesToBind.push({
    binding: gpuInputBuffers.length,
    resource: {
      buffer: gpuOutputBuffer
    }
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: entriesToBind
  });

  return bindGroup;
};

const getDevice = async () => {
  if (!("gpu" in navigator)) {
    console.log("WebGPU is not supported on this device");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
  if (!adapter) { 
    console.log("Adapter not found");
    return;
  }
  return await adapter.requestDevice();
}