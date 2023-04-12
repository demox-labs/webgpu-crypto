/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertBytesToFieldElement, parseAddressToXCoordinate } from "../parsers/AddressParser";
import { convertCiphertextToDataView, getPrivateOwnerBytes, getNonce } from "../parsers/RecordParser";
import { FieldMath } from "../utils/FieldMath";

export class GPUDecryptor {
  public async uint256Addition() {
    // Define global buffer size
    const BUFFER_SIZE = 1000;

    // Compute shader
    const shader = `
    struct UInt256 {
      components: array<u32, 8>
    }

    @group(0) @binding(0)
    var<storage, read_write> output: array<u32>;
    @group(0) @binding(1)
    var<storage, read> input: array<u32>;
    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3u,
      @builtin(local_invocation_id)
      local_id : vec3u,
    ) {
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${BUFFER_SIZE}) {
        return;
      }
      output[global_id.x] =
        u32(global_id.x) * 1000 + u32(local_id.x);
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
    const input = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.UNIFORM
    });
    const output = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const stagingBuffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // 4: Create a GPUBindGroupLayout to define the bind group structure, create a GPUBindGroup from it,
    // then use it to create a GPUComputePipeline

    const bindGroupLayout =
      device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage"
          }
        } as GPUBindGroupLayoutEntry,
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "uniform"
        }
      } as GPUBindGroupLayoutEntry]
      });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: {
          buffer: output,
        }
      }, {
        binding: 1,
        resource: {
          buffer: input,
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

  public async sample() {
    // Define global buffer size
    const BUFFER_SIZE = 1000;

    // Compute shader
    const shader = `
    @group(0) @binding(0)
    var<storage, read_write> output: array<f32>;
    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3u,
      @builtin(local_invocation_id)
      local_id : vec3u,
    ) {
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${BUFFER_SIZE}) {
        return;
      }
      output[global_id.x] =
        f32(global_id.x) * 1000. + f32(local_id.x);
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

    const output = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
    });

    const stagingBuffer = device.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
    });

    // 4: Create a GPUBindGroupLayout to define the bind group structure, create a GPUBindGroup from it,
    // then use it to create a GPUComputePipeline

    const bindGroupLayout =
      device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "storage"
          }
        } as GPUBindGroupLayoutEntry]
      });

    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: {
          buffer: output,
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
    console.log(new Float32Array(data));
  }

  public async bulkIsOwner(cipherTexts: string[], viewKeyScalar: bigint, address: string): Promise<string[]> {
    const start = performance.now();
    const fieldMath = new FieldMath();
    const fieldMathTime = performance.now();
    console.log(`fieldMath: ${fieldMathTime - start}`);
    const address_x = parseAddressToXCoordinate(address);
    const parseAddressToXCoordinateTime = performance.now();
    console.log(`parseAddressToXCoordinateTime: ${parseAddressToXCoordinateTime - fieldMathTime}`);
    const dataViews = cipherTexts.map(cipherText => convertCiphertextToDataView(cipherText));
    const ciphertextsToDataViewsTime = performance.now();
    console.log(`ciphertextsToDataViewsTime: ${ciphertextsToDataViewsTime - parseAddressToXCoordinateTime}`);
    // private
    const ownerBytes = dataViews.map(dataView => getPrivateOwnerBytes(dataView));
    const ownerBytesTime = performance.now();
    console.log(`ownerBytesTime: ${ownerBytesTime - ciphertextsToDataViewsTime}`);
    const ownerFields = ownerBytes.map(ownerByte => BigInt(convertBytesToFieldElement(ownerByte)));
    const ownerFieldsTime = performance.now();
    console.log(`ownerFieldsTime: ${ownerFieldsTime - ownerBytesTime}`);

    // console.log(ownerField);
    const nonceFields = dataViews.map(dataView => getNonce(dataView));
    const nonceFieldsTime = performance.now();
    console.log(`nonceFieldsTime: ${nonceFieldsTime - ownerFieldsTime}`);
    const nonceGroups = nonceFields.map(nonceField => fieldMath.getPointFromX(nonceField));
    const nonceGroupsTime = performance.now();
    console.log(`nonceGroupsTime: ${nonceGroupsTime - nonceFieldsTime}`);
    console.log(`total set up time: ${performance.now() - start}`);
    const multiplications = nonceGroups.map(nonceGroup => fieldMath.multiply(nonceGroup.x, nonceGroup.y, viewKeyScalar));
    const multiplicationsTime = performance.now();
    console.log(`multiplicationsTime: ${multiplicationsTime - nonceGroupsTime}`);
    const recordViewKeys = multiplications.map(multiplication => multiplication.x);
    const recordViewKeysTime = performance.now();
    console.log(`recordViewKeysTime: ${recordViewKeysTime - multiplicationsTime}`);
    const hashes = recordViewKeys.map(recordViewKey => fieldMath.poseidonHashFast(recordViewKey));
    const hashesTime = performance.now();
    console.log(`hashesTime: ${hashesTime - recordViewKeysTime}`);

    const ownersAndCiphers: { ownerX: bigint, ciphertext: string }[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const ownerAndCipher = { ownerX: fieldMath.subtract(ownerFields[i], hashes[i]), ciphertext: cipherTexts[i] };
      ownersAndCiphers.push(ownerAndCipher);
    }
    const ownersAndCiphersTime = performance.now();
    console.log(`ownersAndCiphersTime: ${ownersAndCiphersTime - hashesTime}`);
    console.log(`total time after set up: ${performance.now() - nonceGroupsTime}`)

    return ownersAndCiphers.filter(ownerAndCipher => ownerAndCipher.ownerX === address_x).map(ownerAndCipher => ownerAndCipher.ciphertext);
  }

    // public async uint256Addition() {
    //   const addShader = `
    //     struct UInt256 {
    //       components: array<u32, 8>
    //     }
        
    //     @group(0) @binding(0) var<storage> input1: UInt256;
    //     @group(0) @binding(1) var<storage> input2: UInt256;
    //     @group(0) @binding(2) var<storage, read_write> result: UInt256;
        
    //     fn addComponents(a: u32, b: u32, carry_in: u32) -> array<u32, 2> {
    //         let sum = a + b + carry_in;
    //         return array<u32, 2>(u32(sum % 32), u32(sum >> 32));
    //     }
        
    //     fn addUInt256(a: UInt256, b: UInt256) -> UInt256 {
    //         var sum: UInt256;
    //         sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
    //         var carry: u32 = 0u;
        
    //         for (var i = 0u; i < 8u; i = i + 1u) {
    //             let resultArray = addComponents(a.components[i], b.components[i], carry);
    //             let s = resultArray[0];
    //             let c = resultArray[1];
    //             sum.components[i] = s;
    //             carry = c;
    //         }
        
    //         return sum;
    //     }
        
    //     @compute @workgroup_size(1)
    //     fn main() {
    //       result = addUInt256(input1, input2);
    //     }
    //   `;
  
    //   const gpu: any = (navigator as any).gpu;
    //   if (!gpu) {
    //     throw Error('WebGPU not supported.');
    //   }
  
    //   const adapter = await gpu.requestAdapter();
    //   if (!adapter) {
    //     throw Error('Couldn\'t request WebGPU adapter.');
    //   }
    //   const device = await adapter.requestDevice();
    //   const shaderModule = device.createShaderModule({ code: addShader });
  
    //   const input1Buffer = device.createBuffer({
    //     size: 8 * 4, // 1 UInt256 values
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    //   });
    //   const input2Buffer = device.createBuffer({
    //     size: 8 * 4, // 1 UInt256 values
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    //   });
  
    //   const resultBuffer = device.createBuffer({
    //     size: 8 * 4, // 1 UInt256 value
    //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    //   });
  
    //   const inputA = new Uint32Array([
    //     0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF,
    //     0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFFFFFFF,
    //   ]);
  
    //   const inputB = new Uint32Array([
    //     0x00000001, 0x00000000, 0x00000000, 0x00000000,
    //     0x00000000, 0x00000000, 0x00000000, 0x00000000,
    //   ]);
  
    //   device.queue.writeBuffer(input1Buffer, 0, inputA.buffer);
    //   device.queue.writeBuffer(input2Buffer, inputA.byteLength, inputB.buffer);
  
    //   const bindGroupLayout =
    //     device.createBindGroupLayout({
    //       entries: [
    //         {
    //           binding: 0,
    //           visibility: GPUShaderStage.COMPUTE,
    //           buffer: {
    //             type: "storage"
    //           }
    //         },
    //         {
    //           binding: 1,
    //           visibility: GPUShaderStage.COMPUTE,
    //           buffer: {
    //             type: "storage"
    //           }
    //         },
    //         {
    //         binding: 2,
    //         visibility: GPUShaderStage.COMPUTE,
    //         buffer: {
    //           type: "storage"
    //         }
    //       }]
    //     });
  
    //   const bindGroup = device.createBindGroup({
    //     layout: bindGroupLayout,
    //     entries: [
    //       { binding: 0, resource: { buffer: input1Buffer } },
    //       { binding: 1, resource: { buffer: input2Buffer } },
    //       { binding: 2, resource: { buffer: resultBuffer } },
    //     ],
    //   });
  
    //   const pipeline = device.createComputePipeline({
    //     layout: device.createPipelineLayout({
    //       bindGroupLayouts: [bindGroupLayout]
    //     }),
    //     compute: {
    //       module: shaderModule,
    //       entryPoint: 'main',
    //     },
    //   });
  
    //   // Run the compute shader
    //   const commandEncoder = device.createCommandEncoder();
    //   const passEncoder = commandEncoder.beginComputePass();
    //   passEncoder.setPipeline(pipeline);
    //   passEncoder.setBindGroup(0, bindGroup);
    //   passEncoder.dispatchWorkgroups(1);
    //   passEncoder.end();
  
    //   // Read back the result
    //   device.queue.submit([commandEncoder.finish()]);
  
    //   const result = new Uint32Array(8);
    //   await device.queue.readBuffer(resultBuffer, 0, result.buffer);
  
    //   console.log('Result:', result);
    // }
}