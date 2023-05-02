export const entry = async(input1: Uint32Array, input2: Uint32Array, shaderModules: string[]) => {
  const uint32s1 = new Uint32Array(input1);
  const uint32s2 = new Uint32Array(input2);
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
  const device = await adapter.requestDevice();

  const numU256sToPassIn = uint32s1.length / 8;

  let shaderCode = '';
  for (const shaderModule of shaderModules) {
    shaderCode += shaderModule;
  }
  
  const module = device.createShaderModule({
    code: shaderCode
  });

  const gpuBufferUint256Inputs = device.createBuffer({
    mappedAtCreation: true,
    size: uint32s1.byteLength,
    usage: GPUBufferUsage.STORAGE
  });
  const arrayBufferInput = gpuBufferUint256Inputs.getMappedRange();
  new Uint32Array(arrayBufferInput).set(uint32s1);
  gpuBufferUint256Inputs.unmap();

  const gpuBufferUint256Inputs2 = device.createBuffer({
    mappedAtCreation: true,
    size: uint32s2.byteLength,
    usage: GPUBufferUsage.STORAGE
  });
  const arrayBufferInput2 = gpuBufferUint256Inputs2.getMappedRange();
  new Uint32Array(arrayBufferInput2).set(uint32s2);
  gpuBufferUint256Inputs2.unmap();

  // Result Matrix

  const resultBufferSize = Uint32Array.BYTES_PER_ELEMENT * numU256sToPassIn * 8;
  const resultBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  // Bind group layout and bind group
  const entry1 = {
    binding: 0,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
      type: "read-only-storage"
    }
  };

  const entry2 = {
    binding: 1,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
      type: "read-only-storage"
    }
  };

  const entry3 = {
    binding: 2,
    visibility: GPUShaderStage.COMPUTE,
    buffer: {
      type: "storage"
    }
  };

  const layout = {
    entries: [entry1, entry2, entry3]
  };

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const bindGroupLayout = device.createBindGroupLayout(layout);

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: gpuBufferUint256Inputs
        }
      },
      {
        binding: 1,
        resource: {
          buffer: gpuBufferUint256Inputs2
        }
      },
      {
        binding: 2,
        resource: {
          buffer: resultBuffer
        }
      }
    ]
  });

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
  const workgroupCount = Math.ceil(numU256sToPassIn / 64);
  passEncoder.dispatchWorkgroups(workgroupCount);
  passEncoder.end();

  // Get a GPU buffer for reading in an unmapped state.
  const gpuReadBuffer = device.createBuffer({
    size: resultBufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

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
  const result = new Uint32Array(arrayBuffer);
  return result;
}