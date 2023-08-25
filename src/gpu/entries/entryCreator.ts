import { chunkArray, gpuU32Inputs } from "../utils";

export interface entryOptions {
  u32SizePerOutput: number,
  batchSize?: number
}

export const batchedEntry = async(
  inputData: gpuU32Inputs[],
  shaderModules: string[],
  u32SizePerOutput: number,
  batchSize?: number
  ) => {
  const u32SizePerFirstInput = inputData[0].individualInputSize;
  const totalInputs = inputData[0].u32Inputs.length/ u32SizePerFirstInput;
  const totalExpectedOutputs = totalInputs;
  batchSize = batchSize ?? totalInputs;
  let chunkedInputs = [ inputData ];
  if (batchSize < totalInputs) {
    chunkedInputs = chunkArray(inputData, batchSize);
  }
  const outputResult: Uint32Array = new Uint32Array(totalExpectedOutputs * u32SizePerOutput);
  for (let i = 0; i < chunkedInputs.length; i++) {
    const batchResult = await entry(chunkedInputs[i], shaderModules, u32SizePerOutput);
    outputResult.set(batchResult, i * batchSize * u32SizePerOutput);
  }

  return outputResult;
};

export const entry = async(
  inputData: gpuU32Inputs[],
  shaderModules: string[],
  u32SizePerOutput: number
  ) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const device = (await getDevice())!;
  const allBuffers: GPUBuffer[] = [];
  
  const numInputs = inputData[0].u32Inputs.length / inputData[0].individualInputSize;

  let shaderCode = '';
  for (const shaderModule of shaderModules) {
    shaderCode += shaderModule;
  }
  
  const module = device.createShaderModule({
    code: shaderCode
  });

  const gpuBufferInputs = inputData.map((data) => createU32ArrayInputBuffer(device, data.u32Inputs));

  // Result Matrix
  const resultBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * u32SizePerOutput;
  const resultBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  // Bind group layout and bind group
  const bindGroupLayout = createBindGroupLayout(device, gpuBufferInputs);
  const bindGroup = createBindGroup(device, bindGroupLayout, gpuBufferInputs, resultBuffer);

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

  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  const workgroupCount = Math.ceil(numInputs / 64);
  passEncoder.dispatchWorkgroups(workgroupCount);
  passEncoder.end();

  // Get a GPU buffer for reading in an unmapped state.
  const gpuReadBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  allBuffers.push(...gpuBufferInputs);
  allBuffers.push(resultBuffer);
  allBuffers.push(gpuReadBuffer);

  // Encode commands for copying buffer to buffer.
  commandEncoder.copyBufferToBuffer(
    resultBuffer /* source buffer */,
    0 /* source offset */,
    gpuReadBuffer /* destination buffer */,
    0 /* destination offset */,
    resultBufferSize /* size */
  );

  // Submit GPU commands.
  const gpuCommands = commandEncoder.finish();
  device.queue.submit([gpuCommands]);

  // Read buffer.
  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = gpuReadBuffer.getMappedRange();
  const result = new Uint32Array(arrayBuffer.slice(0));
  gpuReadBuffer.unmap();

  // Destroy all buffers
  for (const buffer of allBuffers) {
    buffer.destroy();
  }
  device.destroy();
  
  return result;
}

const getDevice = async () => {
  if (!("gpu" in navigator)) {
    console.log(
      "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
    );
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
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
    usage: GPUBufferUsage.STORAGE
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