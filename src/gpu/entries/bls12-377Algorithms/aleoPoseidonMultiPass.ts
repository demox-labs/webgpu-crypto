import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { PoseidonFirstHashOutputWGSL, PoseidonRoundFullWGSL, PoseidonRoundPartialWGSL } from "../../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { multipassEntryCreator, GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo } from "../multipassEntryCreator";
import { workgroupSize } from "../../curveSpecific";
import { U256WGSL } from "../../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { gpuU32Inputs } from "../../utils";
import { prune } from "../../prune";

export const aleo_poseidon_multi = async (
  input1: gpuU32Inputs,
  input2: gpuU32Inputs,
  input3: gpuU32Inputs
  ) => {
  const [executionSteps, entryInfo] = poseidon_multipass_info(input1, input2, input3);

  return await multipassEntryCreator(executionSteps, entryInfo);
};

export const poseidon_multipass_info = (
  input1: gpuU32Inputs,
  aleoMds: gpuU32Inputs,
  aleoRoundConstants: gpuU32Inputs,
  useInputs = true,
  numberInputs?: number
  ): [GPUExecution[], IEntryInfo] => {
  const baseModules = [U256WGSL, AleoPoseidonConstantsWGSL, BLS12_377ParamsWGSL, FieldModulusWGSL];
  const numInputs = numberInputs ? numberInputs : input1.u32Inputs.length / input1.individualInputSize;
  const nonArrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const arrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 9; // Because 9 fields per array
  const aleoMdsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 9 * 8 * 9;
  const aleoRoundConstantsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 39 * 8 * 9;

  const firstHashEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<u256>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_first_hash_output(input1[global_id.x]);
      output[global_id.x] = result;
    }
  `;

  const fullRoundEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>, 39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_full(input1[global_id.x], ${roundOffset}u);
      output[global_id.x] = result;
    }
  `;

  const partialRoundEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_partial(input1[global_id.x], ${roundOffset}u);
      output[global_id.x] = result;
    }
  `;

  const finalEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<u256>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = input1[global_id.x][1];
      output[global_id.x] = result;
    }
  `;

  const executionSteps: GPUExecution[] = [];

  // Add first hash step
  const firstHashEntryShaderCode = prune(
    [...baseModules, PoseidonFirstHashOutputWGSL].join('\n'),
    ['poseidon_first_hash_output']
  ) + firstHashEntry;
  const firstHashShader: IShaderCode = {
    code: firstHashEntryShaderCode,
    entryPoint: "main"
  };
  const firstHashInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [nonArrayBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: useInputs ? new Map<number, Uint32Array>([[0, input1.u32Inputs]]) : undefined
  }
  const firstHashResult: IGPUResult = { 
    resultBufferTypes: ["storage"],
    resultBufferSizes: [arrayBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  };
  const firstHashExecution = new GPUExecution(firstHashShader, firstHashInputs, firstHashResult);
  executionSteps.push(firstHashExecution);

  // Add first 4 full round executions
  for (let i = 0; i < 4; i++) {
    const fullRoundShaderCode = prune(
      [...baseModules, PoseidonRoundFullWGSL].join('\n'),
      ['poseidon_round_full']
    ) + fullRoundEntry(i);
    const fullRoundShader: IShaderCode = {
      code: fullRoundShaderCode,
      entryPoint: "main"
    };
    const fullRoundInputs: IGPUInput = {
      inputBufferTypes: ["storage", "read-only-storage", "read-only-storage"],
      inputBufferSizes: [arrayBufferSize, aleoMdsBufferSize, aleoRoundConstantsBufferSize],
      inputBufferUsages: [
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        GPUBufferUsage.STORAGE,
        GPUBufferUsage.STORAGE
      ],
      mappedInputs: new Map<number, Uint32Array>([[1, aleoMds.u32Inputs], [2, aleoRoundConstants.u32Inputs]])
    }
    const fullRoundResult: IGPUResult = { 
      resultBufferTypes: ["storage"],
      resultBufferSizes: [arrayBufferSize],
      resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
    };
    const fullRoundExecution = new GPUExecution(fullRoundShader, fullRoundInputs, fullRoundResult);
    executionSteps.push(fullRoundExecution);
  }

  // Add the 31 partial round executions
  for (let i = 0; i < 31; i++) {
    const partialRoundShaderCode = prune(
      [...baseModules, PoseidonRoundPartialWGSL].join('\n'),
      ['poseidon_round_partial']
    ) + partialRoundEntry(i + 4);
    const partialRoundShader: IShaderCode = {
      code: partialRoundShaderCode,
      entryPoint: "main"
    };
    const partialRoundInputs: IGPUInput = {
      inputBufferTypes: ["storage", "read-only-storage", "read-only-storage"],
      inputBufferSizes: [arrayBufferSize, aleoMdsBufferSize, aleoRoundConstantsBufferSize],
      inputBufferUsages: [
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        GPUBufferUsage.STORAGE,
        GPUBufferUsage.STORAGE
      ],
      mappedInputs: new Map<number, Uint32Array>([[1, aleoMds.u32Inputs], [2, aleoRoundConstants.u32Inputs]])
    }
    const partialRoundResult: IGPUResult = { 
      resultBufferTypes: ["storage"],
      resultBufferSizes: [arrayBufferSize],
      resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
    };
    const partialRoundExecution = new GPUExecution(partialRoundShader, partialRoundInputs, partialRoundResult);
    executionSteps.push(partialRoundExecution);
  }

  // Add final 4 full round executions
  for (let i = 0; i < 4; i++) {
    const fullRoundShaderCode = prune(
      [...baseModules, PoseidonRoundFullWGSL].join('\n'),
      ['poseidon_round_full']
    ) + fullRoundEntry(i + 35);
    const fullRoundShader: IShaderCode = {
      code: fullRoundShaderCode,
      entryPoint: "main"
    };
    const fullRoundInputs: IGPUInput = {
      inputBufferTypes: ["storage", "read-only-storage", "read-only-storage"],
      inputBufferSizes: [arrayBufferSize, aleoMdsBufferSize, aleoRoundConstantsBufferSize],
      inputBufferUsages: [
        GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        GPUBufferUsage.STORAGE,
        GPUBufferUsage.STORAGE
      ],
      mappedInputs: new Map<number, Uint32Array>([[1, aleoMds.u32Inputs], [2, aleoRoundConstants.u32Inputs]])
    }
    const fullRoundResult: IGPUResult = { 
      resultBufferTypes: ["storage"],
      resultBufferSizes: [arrayBufferSize],
      resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
    };
    const fullRoundExecution = new GPUExecution(fullRoundShader, fullRoundInputs, fullRoundResult);
    executionSteps.push(fullRoundExecution);
  }

  // Add final step
  const finalStepShaderCode = prune(
    [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL].join('\n'),
    []
  ) + finalEntry;
  const finalShader: IShaderCode = {
    code: finalStepShaderCode,
    entryPoint: "main"
  };
  const finalInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [arrayBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
  }
  const finalResult: IGPUResult = { 
    resultBufferTypes: ["storage"],
    resultBufferSizes: [nonArrayBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  };
  const finalExecution = new GPUExecution(finalShader, finalInputs, finalResult);
  executionSteps.push(finalExecution);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: nonArrayBufferSize
  };

  return [executionSteps, entryInfo];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).aleo_poseidon_multi = aleo_poseidon_multi;