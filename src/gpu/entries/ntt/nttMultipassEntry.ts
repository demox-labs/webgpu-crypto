import { FIELD_SIZE } from "../../U32Sizes";
import { workgroupSize } from "../../params";
import { bigIntToU32Array, gpuU32Inputs } from "../../utils";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { IEntryInfo, IShaderCode, getDevice } from "../multipassEntryCreator";


export const ntt_multipass_info = (
  numInputs: number,
  roots: { [index: number]: bigint; },
  fieldModulus: bigint,
  fieldParams: string
): [IShaderCode[], IEntryInfo] => {
  const logNumInputs = Math.log2(numInputs);
  let wCurrent = roots[logNumInputs];
  const wnPrecomputed: bigint[] = [wCurrent];
  for (let i = 0; i < logNumInputs; i++) {
    wCurrent = (wCurrent * wCurrent) % fieldModulus;
    wnPrecomputed.push(wCurrent);
  }
  const baseModules = [U256WGSL, fieldParams, FieldModulusWGSL];  

  const shaders: IShaderCode[] = [];
  const inputOutputBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;
  const fieldModulusU32 = `${bigIntToU32Array(fieldModulus).join('u, ')}u`;

  // Steps 1 to log(n) - 1: Parallelized Cooley-Tukey FFT algorithm
  for (let i = 0; i < logNumInputs; i++) {
    const wN = wnPrecomputed[logNumInputs - i - 1];
    const wNEntry = `
      @group(0) @binding(0)
      var<storage, read_write> wN: array<Field>;

      @compute @workgroup_size(${workgroupSize})
      fn main(
          @builtin(global_invocation_id)
          global_id : vec3<u32>
      ) {
          let field_modulus = Field(array<u32, 8>(${fieldModulusU32}));
          let halfLen: u32 = ${2**i}u;
          let j: u32 = global_id.x % halfLen;
          let wn: Field = Field(array<u32, 8>(${bigIntToU32Array(wN).join('u, ')}u));
          wN[j] = gen_field_pow(wn, Field(array<u32, 8>(0u, 0u, 0u, 0u, 0u, 0u, 0u, j)), field_modulus);
      }
    `;

    const wNShader: IShaderCode = {
      code: [...baseModules, wNEntry].join("\n"),
      entryPoint: "main"
    }
    shaders.push(wNShader);

    const logPassEntry = `
      @group(0) @binding(0)
      var<storage, read_write> coeffs: array<Field>;

      @group(0) @binding(1)
      var<storage, read_write> wi_precomp: array<Field>;

      @compute @workgroup_size(${workgroupSize})
      fn main(
          @builtin(global_invocation_id)
          global_id : vec3<u32>
      ) {
          let len: u32 = ${2**(i + 1)}u;
          let halfLen: u32 = ${2**i}u;
          let group_id: u32 = global_id.x / halfLen;
          let field_modulus = Field(array<u32, 8>(${fieldModulusU32}));

          let i: u32 = group_id * len;
          let j: u32 = global_id.x % halfLen;
          let w_i = wi_precomp[j];
          let u: Field = coeffs[i + j];
          let v: Field = gen_field_multiply(w_i, coeffs[i + j + halfLen], field_modulus);
          coeffs[i + j] = gen_field_add(u, v, field_modulus);
          coeffs[i + j + halfLen] = gen_field_sub(u, v, field_modulus);
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
  roots: { [index: number]: bigint; },
  fieldModulus: bigint,
  fieldParams: string
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const gpu = (await getDevice())!;
    const commandEncoder = gpu.createCommandEncoder();
    const numInputs = polynomialCoefficients.u32Inputs.length / polynomialCoefficients.individualInputSize;
    const inputOutputBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;

    const wNBuffer = gpu.createBuffer({
      size: inputOutputBufferSize / 2,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    const buffer = gpu.createBuffer({
      mappedAtCreation: true,
      size: inputOutputBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });

    const arrayBufferInput = buffer.getMappedRange();
    new Uint32Array(arrayBufferInput).set(polynomialCoefficients.u32Inputs);
    buffer.unmap();

    const [shaders, entryInfo] = ntt_multipass_info(numInputs, roots, fieldModulus, fieldParams);
    for (let i = 0; i < shaders.length; i += 2) {
      const wnShader = shaders[i];
      const wnShaderModule = gpu.createShaderModule({ code: wnShader.code });
      const wnLayoutEntry: GPUBindGroupLayoutEntry = {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      };
      const wnLayout = { entries: [wnLayoutEntry] };
      const wnBindGroupLayout = gpu.createBindGroupLayout(wnLayout);
      const wnBindGroup = gpu.createBindGroup({
        layout: wnBindGroupLayout,
        entries: [{
          binding: 0,
          resource: {
            buffer: wNBuffer
          }
        }]
      });
      const wnPipeline = gpu.createComputePipeline({
        layout: gpu.createPipelineLayout({ bindGroupLayouts: [wnBindGroupLayout] }),
        compute: {
          module: wnShaderModule,
          entryPoint: wnShader.entryPoint
        }
      });
      const wnPassEncoder = commandEncoder.beginComputePass();
      wnPassEncoder.setPipeline(wnPipeline);
      wnPassEncoder.setBindGroup(0, wnBindGroup);
      wnPassEncoder.dispatchWorkgroups(Math.ceil(2**(i / 2) / workgroupSize));
      wnPassEncoder.end();

      const shader = shaders[i + 1];
      const shaderModule = gpu.createShaderModule({ code: shader.code });

      const layoutEntry: GPUBindGroupLayoutEntry = {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      };
      const precompLayoutEntry: GPUBindGroupLayoutEntry = {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: 'storage'
        }
      };
      const layout = { entries: [layoutEntry, precompLayoutEntry] };
      const bindGroupLayout = gpu.createBindGroupLayout(layout);
      const bindGroup = gpu.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: {
            buffer: buffer
          },
        }, {
          binding: 1,
          resource: {
            buffer: wNBuffer
          },
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
    wNBuffer.destroy();
    buffer.destroy();
    gpu.destroy();

    return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).ntt_multipass = ntt_multipass;