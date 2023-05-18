import { workgroupSize } from "../params";

export const multiPassEntry = async(
  inputsAsArrays: Array<number>[],
  shaderModules: string[],
  passes: number,
  byteSizePerFirstInput?: number,
  byteSizePerOutput?: number
  ) => {
  // const start = performance.now();
  const inputs = inputsAsArrays.map((input) => new Uint32Array(input));
  const bytesPerFirstInput = byteSizePerFirstInput ?? 8;
  const bytesPerOutput = byteSizePerOutput ?? 8;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const device = (await getDevice())!;
  
  let shaderCode = '';
  for (const shaderModule of shaderModules) {
    shaderCode += shaderModule;
  }
  
  const module = device.createShaderModule({
    code: shaderCode
  });

  const gpuBufferInputs = inputs.map((input) => createU32ArrayInputBuffer(device, input));

  // Bind group layout and bind group
  const bindGroupLayout = createBindGroupLayout(device, gpuBufferInputs);

  // Pipeline setup
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    }),
    compute: {
      module: module,
      entryPoint: "main"
    }
  });

  // Commands submission
  const commandEncoder = device.createCommandEncoder();

  const gpuReadBuffer = runPasses(commandEncoder, device, computePipeline, inputs, passes, bytesPerFirstInput, bytesPerOutput);

  // Submit GPU commands.
  const gpuCommands = commandEncoder.finish();
  // console.log(performance.now() - start);
  device.queue.submit([gpuCommands]);

  // Read buffer.
  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = gpuReadBuffer.getMappedRange();
  const result = new Uint32Array(arrayBuffer.slice(0));
  gpuReadBuffer.unmap();
  
  return result;
}

const runPasses = (
  commandEncoder: GPUCommandEncoder,
  device: GPUDevice,
  computePipeline: GPUComputePipeline,
  inputs: Uint32Array[],
  passes: number,
  bytesPerFirstInput: number,
  bytesPerOutput: number
  ): GPUBuffer => {
  const numInputs = inputs[0].length / bytesPerFirstInput;
  const resultBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * bytesPerOutput;

  const gpuBufferInputs = inputs.map((inputsForNextPass) => createU32ArrayInputBuffer(device, inputsForNextPass));
  const gpuReadBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });
  for (let i = 0; i < passes; i++) {
    const resultBuffer = device.createBuffer({
      size: resultBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const bindGroupLayout = createBindGroupLayout(device, gpuBufferInputs);
    const bindGroup = createBindGroup(device, bindGroupLayout, gpuBufferInputs, resultBuffer);

    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, bindGroup);
    const workgroupCount = Math.ceil(numInputs / workgroupSize);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    if (i !== passes - 1) {
      // Encode commands for copying buffer to buffer.
      commandEncoder.copyBufferToBuffer(
        resultBuffer /* source buffer */,
        0 /* source offset */,
        gpuBufferInputs[0] /* destination buffer */,
        0 /* destination offset */,
        resultBufferSize /* size */
      );
    } else {
      commandEncoder.copyBufferToBuffer(
        resultBuffer /* source buffer */,
        0 /* source offset */,
        gpuReadBuffer /* destination buffer */,
        0 /* destination offset */,
        resultBufferSize /* size */
      );
    }
  }

  return gpuReadBuffer;
};

const getDevice = async () => {
  if (!("gpu" in navigator)) {
    console.log(
      "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
    );
    return;
  }

  const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
  if (!adapter) {
    console.log("Failed to get GPU adapter.");
    return;
  }
  return await adapter.requestDevice();
};

const createU32ArrayInputBuffer = (device: GPUDevice, uint32s: Uint32Array) => {
  const gpuBufferU32Inputs = device.createBuffer({
    mappedAtCreation: true,
    size: uint32s.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  const arrayBufferInput = gpuBufferU32Inputs.getMappedRange();
  new Uint32Array(arrayBufferInput).set(uint32s);
  gpuBufferU32Inputs.unmap();
  return gpuBufferU32Inputs;
};

const createBindGroupLayout = (device: GPUDevice, gpuInputBuffers: GPUBuffer[]) => {
  // Bind group layout and bind group
  const layoutEntries: GPUBindGroupLayoutEntry[] = [];
  for (let i = 0; i < gpuInputBuffers.length; i++) {
    layoutEntries.push({
      binding: i,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "read-only-storage"
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