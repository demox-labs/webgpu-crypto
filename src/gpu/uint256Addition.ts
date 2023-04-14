// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export async function actualUint256Addition(uint32Array1, uint32Array2) {
  console.log(uint32Array1);
  console.log(uint32Array2);
  const uint32s1 = new Uint32Array(uint32Array1);
  const uint32s2 = new Uint32Array(uint32Array2);
  console.log(uint32s1);
  console.log(uint32s2);
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

  // Compute shader
  const shader = `
    struct UInt256 {
      components: array<u32, 8>
    }

    struct UInt256s {
      uint256s: array<UInt256>
    }

    const aleoFieldOrderComponents = array<u32, 8>(1, 1, 0, 0, 0, 0, 0, 0);
    // var aleoFieldOrder: UInt256;
    // aleoFieldOrder.components = aleoFieldOrderComponents;

    @group(0) @binding(0)
    var<storage, read> input1: UInt256s;
    @group(0) @binding(1)
    var<storage, read> input2: UInt256s;
    @group(0) @binding(2)
    var<storage, read_write> output: UInt256s;

    fn addComponents(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
      var sum: vec2<u32>;
      let total = a + b + carry_in;
      // potential bitwise speed ups here
      sum[0] = total & 4294967295u;
      sum[1] = total / 4294967295u;
      return sum;
    }
  
    fn addUInt256(a: UInt256, b: UInt256) -> UInt256 {
        var sum: UInt256;
        sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
        var carry: u32 = 0u;
    
        for (var i = 0u; i < 8u; i = i + 1u) {
            let componentResult = addComponents(a.components[i], b.components[i], carry);
            sum.components[i] = componentResult[0];
            carry = componentResult[1];
        }
    
        return sum;
    }

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      // // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var sum = addUInt256(input1.uint256s[global_id.x], input2.uint256s[global_id.x]);
        // output.uint256s[global_id.x].components = input1.uint256s[global_id.x].components;
        // output.uint256s[global_id.x].components = input2.uint256s[global_id.x].components;
        output.uint256s[global_id.x].components = sum.components;
      }
    }
    `;
  const module = device.createShaderModule({
    code: shader
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
  return Array.from(new Uint32Array(arrayBuffer));
}

export const uint256Addition = async () => {
  const numUintsToPassIn = 1;

  // Define global buffer size
  const BUFFER_SIZE = numUintsToPassIn * 32;

  // Compute shader
  const shader = `
    struct UInt256 {
      components: array<u32, 8>
    }

    struct UInt256s {
      uint256s: array<UInt256>
    }

    @group(0) @binding(0)
    var<storage, read_write> output: UInt256s;
    @group(0) @binding(1)
    var<storage, read> input: UInt256s;
    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      // // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      output.uint256s[global_id.x].components = input.uint256s[global_id.x].components;
    }
    `;

  // Main function

  // 1: request adapter and device
  const gpu = navigator.gpu;
  if (!gpu) {
    throw Error('WebGPU not supported.');
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw Error('Couldn\'t request WebGPU adapter.');
  }

  const device = await adapter.requestDevice();

  // 2: Create a shader module from the shader template literal
  const shaderModule = device.createShaderModule({
    code: shader
  });

  // 3: Create an output buffer to read GPU calculations to, and a staging buffer to be mapped for JavaScript access
  const uint256Data = new Uint32Array(numUintsToPassIn * 8);
  for (let i = 0; i < numUintsToPassIn * 8; i++) {
    uint256Data[i] = i % 32;
  }
  const input = device.createBuffer({
    size: uint256Data.byteLength,
    usage: GPUBufferUsage.MAP_WRITE,
    mappedAtCreation: true
  });
  new Uint32Array(input.getMappedRange()).set(uint256Data);
  input.unmap();
  const output = device.createBuffer({
    size: uint256Data.byteLength,
    usage: GPUBufferUsage.STORAGE
  });
  output.unmap();
  // new Uint32Array(output.getMappedRange()).set(uint256Data);
  // output.unmap();

  const stagingBuffer = device.createBuffer({
    size: uint256Data.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
  });

  // 4: Create a GPUBindGroupLayout to define the bind group structure, create a GPUBindGroup from it,
  // then use it to create a GPUComputePipeline

  const bindGroupLayout =
    device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "read-only-storage"
          }
        } as GPUBindGroupLayoutEntry,
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: input
        } as GPUBindGroupLayoutEntry]
    });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{
      binding: 0,
      // buffer: output,
      resource: {
        buffer: output,
        offset: 0,
        size: uint256Data.byteLength
      }
    }, {
      binding: 1,
      // buffer: input,
      resource: {
        buffer: input,
        offset: 0,
        size: uint256Data.byteLength
      }
    }]
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    }),
    compute: {
      module: shaderModule,
      entryPoint: 'main'
    }
  });

  // 5: Create GPUCommandEncoder to issue commands to the GPU
  const commandEncoder = device.createCommandEncoder();

  // 6: Initiate render pass
  const passEncoder = commandEncoder.beginComputePass();

  // 7: Issue commands
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatchWorkgroups(Math.ceil(BUFFER_SIZE / 64));

  // End the render pass
  passEncoder.end();

  // Copy output buffer to staging buffer
  commandEncoder.copyBufferToBuffer(
    output,
    0, // Source offset
    stagingBuffer,
    0, // Destination offset
    BUFFER_SIZE
  );

  // 8: End frame by passing array of command buffers to command queue for execution
  device.queue.submit([commandEncoder.finish()]);

  // map staging buffer to read results back to JS
  await stagingBuffer.mapAsync(
    GPUMapMode.READ,
    0, // Offset
    BUFFER_SIZE // Length
  );

  const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFFER_SIZE);
  const data = copyArrayBuffer.slice(0);
  stagingBuffer.unmap();
  console.log(new Uint32Array(data));
}