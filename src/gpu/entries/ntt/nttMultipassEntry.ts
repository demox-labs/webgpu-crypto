import { FIELD_MODULUS, ROOTS_OF_UNITY } from "../../../params/BLS12_377Constants";
import { FIELD_SIZE } from "../../U32Sizes";
import { workgroupSize } from "../../params";
import { bigIntToU32Array, gpuU32Inputs } from "../../utils";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { IEntryInfo, IShaderCode, getDevice } from "../multipassEntryCreator";


export const ntt_multipass_info = (
  numInputs: number,
  maxIterations: number,
): [IShaderCode[], IEntryInfo] => {
  const logNumInputs = Math.log2(numInputs);
  let wCurrent = ROOTS_OF_UNITY[logNumInputs];
  const wnPrecomputed: bigint[] = [wCurrent];
  for (let i = 0; i < logNumInputs; i++) {
    wCurrent = (wCurrent * wCurrent) % FIELD_MODULUS;
    wnPrecomputed.push(wCurrent);
  }
  const baseModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL];  

  const shaders: IShaderCode[] = [];
  const inputOutputBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;

  // Steps 1 to log(n) - 1: Parallelized Cooley-Tukey FFT algorithm
  for (let i = 0; i < Math.min(logNumInputs, maxIterations); i++) {
    const wN = wnPrecomputed[logNumInputs - i - 1];
    const logPassEntry = `
      @group(0) @binding(0)
      var<storage, read_write> coeffs: array<Field>;

      @compute @workgroup_size(${workgroupSize})
      fn main(
          @builtin(global_invocation_id)
          global_id : vec3<u32>
      ) {
          let len: u32 = ${2**(i + 1)}u;
          let halfLen: u32 = ${2**i}u;
          let group_id: u32 = global_id.x / halfLen;

          let wn: Field = Field(array<u32, 8>(${bigIntToU32Array(wN).join('u, ')}u));
          let i: u32 = group_id * len;
          let j: u32 = global_id.x % halfLen;
          let w_i: Field = field_pow(wn, Field(array<u32, 8>(0u, 0u, 0u, 0u, 0u, 0u, 0u, j)));
          let u: Field = coeffs[i + j];
          let v: Field = field_multiply(w_i, coeffs[i + j + halfLen]);
          coeffs[i + j] = field_add(u, v);
          coeffs[i + j + halfLen] = field_sub(u, v);
      }
    `;

    const logPassShader: IShaderCode = {
      code: [...baseModules, logPassEntry].join("\n"),
      entryPoint: "main"
    }
    shaders.push(logPassShader);
  }

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: inputOutputBufferSize,
    numInputsForWorkgroup: numInputs / 2
  };

  return [shaders, entryInfo];
}

export const ntt_multipass = async (
  polynomialCoefficients: gpuU32Inputs,
  maxIterations: number
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const gpu = (await getDevice())!;
    const commandEncoder = gpu.createCommandEncoder();
    const numInputs = polynomialCoefficients.u32Inputs.length / polynomialCoefficients.individualInputSize;
    const inputOutputBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;

    const buffer = gpu.createBuffer({
      mappedAtCreation: true,
      size: inputOutputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const arrayBufferInput = buffer.getMappedRange();
    new Uint32Array(arrayBufferInput).set(polynomialCoefficients.u32Inputs);
    buffer.unmap();

    const [shaders, entryInfo] = ntt_multipass_info(numInputs, maxIterations);
    for (let i = 0; i < shaders.length; i++) {
      const shader = shaders[i];
      const shaderModule = gpu.createShaderModule({ code: shader.code });

      const layoutEntry: GPUBindGroupLayoutEntry = {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      };
      const layout = { entries: [layoutEntry] };
      const bindGroupLayout = gpu.createBindGroupLayout(layout);
      const bindGroup = gpu.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: {
            buffer: buffer
          }
        }]
      });
  
      // Create pipeline
      const pipeline = gpu.createComputePipeline({
        layout: gpu.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
        compute: {
          module: shaderModule,
          entryPoint: shader.entryPoint
        }
      });

      // Run compute pass
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil((entryInfo.numInputsForWorkgroup ?? entryInfo.numInputs) / workgroupSize));
      passEncoder.end();
    }
    
    // Create buffer to read result
    const gpuReadBuffer = gpu.createBuffer({
      size: entryInfo.outputSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });

    commandEncoder.copyBufferToBuffer(
      buffer,
      0,
      gpuReadBuffer,
      0,
      entryInfo.outputSize
    );

    const gpuCommands = commandEncoder.finish();
    gpu.queue.submit([gpuCommands]);

    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    const result = new Uint32Array(arrayBuffer.slice(0));
    gpuReadBuffer.unmap();

    gpuReadBuffer.destroy();
    buffer.destroy();
    gpu.destroy();

    return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).ntt_multipass = ntt_multipass;