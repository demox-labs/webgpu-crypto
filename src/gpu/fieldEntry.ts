import { FieldWGSL } from './Field';

export const field_add = async(uint32Array1: Uint32Array, uint32Array2: Uint32Array) => {
  const uint32s1 = new Uint32Array(uint32Array1);
  const uint32s2 = new Uint32Array(uint32Array2);
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

  const numUintsToPassIn = uint32s1.length / 8;

  let shaderCode = '';
  shaderCode += FieldWGSL;

  const shaderEntry = `
  @group(0) @binding(0)
  var<storage, read> input1: Fields;
  @group(0) @binding(1)
  var<storage, read> input2: Fields;
  @group(0) @binding(2)
  var<storage, read_write> output: Fields;

  @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var sum = field_add(input1.fields[global_id.x], input2.fields[global_id.x]);
        output.fields[global_id.x].components = sum.components;
      }
    }
    `;

    shaderCode += shaderEntry;


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

  const resultBufferSize = Uint32Array.BYTES_PER_ELEMENT * numUintsToPassIn * 8;
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
  const workgroupCount = Math.ceil(numUintsToPassIn / 64);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_add = field_add;