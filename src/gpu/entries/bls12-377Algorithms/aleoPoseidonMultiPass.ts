import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { PoseidonFirstHashOutputWGSL, PoseidonRoundFullWGSL, PoseidonRoundPartialWGSL } from "../../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { multipassEntryCreator, GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo } from "../multipassEntryCreator";
import { workgroupSize } from "../../params";
import { U256WGSL } from "../../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";

export const aleo_poseidon_multi = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  const [executionSteps, entryInfo] = poseidon_multipass_info(input1.length / 8, input1, input2, input3);

  return await multipassEntryCreator(executionSteps, entryInfo);
};

export const poseidon_multipass_info = (
  numInputs: number,
  input1: Array<number>,
  aleoMds: Array<number>,
  aleoRoundConstants: Array<number>,
  useInputs = true
  ): [GPUExecution[], IEntryInfo] => {
  const baseModules = [AleoPoseidonConstantsWGSL, FieldModulusWGSL, U256WGSL, BLS12_377ParamsWGSL];
  const nonArrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const arrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 9; // Because 9 fields per array
  const aleoMdsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 9 * 8 * 9;
  const aleoRoundConstantsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 39 * 8 * 9;

  const firstHashEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_first_hash_output(input1.u256s[global_id.x]);
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
  const firstHashShader: IShaderCode = {
    code: [...baseModules, PoseidonFirstHashOutputWGSL, firstHashEntry].join('\n'),
    entryPoint: "main"
  };
  const firstHashInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [nonArrayBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: useInputs ? new Map<number, Uint32Array>([[0, new Uint32Array(input1)]]) : undefined
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
    const fullRoundShader: IShaderCode = {
      code: [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(i)].join('\n'),
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
      mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
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
    const partialRoundShader: IShaderCode = {
      code: [...baseModules, PoseidonRoundPartialWGSL, partialRoundEntry(i + 4)].join('\n'),
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
      mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
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
    const fullRoundShader: IShaderCode = {
      code: [...baseModules, PoseidonRoundFullWGSL, fullRoundEntry(i + 35)].join('\n'),
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
      mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
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
  const finalShader: IShaderCode = {
    code: [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, finalEntry].join('\n'),
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
(window as any).aleo_poseidon_multi_2 = aleo_poseidon_multi;