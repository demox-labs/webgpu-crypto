// use bigint_256 in aleo for good examples on implementing carry adds/carry multiplies

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export async function actualUint256Addition(uint32Array1, uint32Array2) {
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

  // Compute shader
  const shader = `
    struct UInt256 {
      components: array<u32, 8>
    }

    struct UInt256s {
      uint256s: array<UInt256>
    }

    // 8444461749428370424248824938781546531375899335154063827935233455917409239041
    const aleoFieldOrderComponents = array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 1);
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
      sum[0] = total;
      sum[1] = 0u;
      // if the total is less than a, then we know there was a carry
      // need to subtract the carry_in for the edge case though, where the two largest
      // u32s are added together.
      if ((total - carry_in) < a) {
        sum[1] = 1u;
      }
      return sum;
    }

    fn subtractComponents(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
      var sub: vec2<u32>;
      let total = a - b - carry_in;
      sub[0] = total;
      sub[1] = 0u;
      if ((total + carry_in) > a) {
        sub[1] = 1u;
      }
      return sub;
    }
  
    fn addUInt256(a: UInt256, b: UInt256) -> UInt256 {
        var sum: UInt256;
        sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
        var carry: u32 = 0u;
    
        for (var i = 7i; i >= 0i; i--) {
            let componentResult = addComponents(a.components[i], b.components[i], carry);
            sum.components[i] = componentResult[0];
            carry = componentResult[1];
        }

        var resultGreaterThanAleoFieldOrder = false;

        for (var i = 0u; i < 8u; i++) {
          if (sum.components[i] > aleoFieldOrderComponents[i]) {
            resultGreaterThanAleoFieldOrder = true;
            break;
          }

          if (sum.components[i] < aleoFieldOrderComponents[i]) {
            break;
          }

          if (i == 7u && sum.components[i] == aleoFieldOrderComponents[i]) {
            resultGreaterThanAleoFieldOrder = true;
          }
        }

        if (resultGreaterThanAleoFieldOrder) {
          carry = 0u;
          for (var i = 7i; i >= 0i; i--) {
            let componentResult = subtractComponents(sum.components[i], aleoFieldOrderComponents[i], carry);
            sum.components[i] = componentResult[0];
            carry = componentResult[1];
          }
        }
    
        return sum;
    }

    fn fuckthis(a: UInt256, b: UInt256) -> UInt256 {
      var sum: UInt256;
      sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
      var carry: u32 = 0u;
  
      let componentResult = subtractComponents(a.components[7], b.components[7], carry);
      sum.components[7] = componentResult[0];
      sum.components[6] = componentResult[1];
  
      return sum;
  }

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var sum = addUInt256(input1.uint256s[global_id.x], input2.uint256s[global_id.x]);
        // var sum = fuckthis(input1.uint256s[global_id.x], input2.uint256s[global_id.x]);
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
  const result = new Uint32Array(arrayBuffer);
  gpuReadBuffer.unmap();
  return result;
}