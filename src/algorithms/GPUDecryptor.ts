/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertBytesToFieldElement, parseAddressToXCoordinate } from "../parsers/AddressParser";
import { convertCiphertextToDataView, getPrivateOwnerBytes, getNonce } from "../parsers/RecordParser";
import { FieldMath } from "../utils/FieldMath";

export class GPUDecryptor {
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
    const gpu: any = (navigator as any).gpu;
    if (!gpu) {
      throw Error('WebGPU not supported.');
    }

    const adapter: any = await gpu.requestAdapter();
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
      }]
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
    const data = copyArrayBuffer.slice();
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

    const ownersAndCiphers: { ownerX: bigint, ciphertext: string}[] = [];
    for (let i = 0; i < hashes.length; i++) {
      const ownerAndCipher = { ownerX: fieldMath.subtract(ownerFields[i], hashes[i]), ciphertext: cipherTexts[i] };
      ownersAndCiphers.push(ownerAndCipher);
    }
    const ownersAndCiphersTime = performance.now();
    console.log(`ownersAndCiphersTime: ${ownersAndCiphersTime - hashesTime}`);
    console.log(`total time after set up: ${performance.now() - nonceGroupsTime}`)

    return ownersAndCiphers.filter(ownerAndCipher => ownerAndCipher.ownerX === address_x).map(ownerAndCipher => ownerAndCipher.ciphertext);
  }
}