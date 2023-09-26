import { FieldModulusWGSL } from "../wgsl/FieldModulus";
import { PoseidonFirstHashOutputWGSL, PoseidonRoundFullWGSL, PoseidonRoundPartialWGSL } from "../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../wgsl/AleoPoseidonConstants";
import { U256WGSL } from "../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../wgsl/BLS12-377Params";
import { GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo, multipassEntryCreatorReuseBuffers } from "./multipassEntryCreatorBufferReuse";
import { workgroupSize } from "../curveSpecific";

export const field_poseidon_reuse = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  const gpu = (await getDevice())!;
  const [executionSteps, entryInfo] = poseidon_multipass_info_buffers(gpu, input1.length / 8, new Uint32Array(input1), new Uint32Array(input2), new Uint32Array(input3), new Map<number, GPUBuffer[]>());

  return await multipassEntryCreatorReuseBuffers(gpu, executionSteps, entryInfo);
};

export const poseidon_multipass_info_buffers = (
  gpu: GPUDevice,
  numInputs: number,
  input1: Uint32Array,
  aleoMds: Uint32Array,
  aleoRoundConstants: Uint32Array,
  buffersToReuse: Map<number, GPUBuffer[]>,
  useInputs = true
  ): [GPUExecution[], IEntryInfo] => {
  const baseModules = [AleoPoseidonConstantsWGSL, FieldModulusWGSL, U256WGSL, BLS12_377ParamsWGSL];
  const fieldsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const arrayBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 9; // Because 9 fields per array
  const aleoMdsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 9 * 8 * 9;
  const aleoRoundConstantsBufferSize = Uint32Array.BYTES_PER_ELEMENT * 39 * 8 * 9;

  addNeededBuffers(gpu, fieldsBufferSize, 1, buffersToReuse);
  addNeededBuffers(gpu, arrayBufferSize, 2, buffersToReuse);
  addNeededBuffers(gpu, aleoMdsBufferSize, 1, buffersToReuse);
  addNeededBuffers(gpu, aleoRoundConstantsBufferSize, 1, buffersToReuse);

  const firstHashEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<u256>;
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
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>, 39>;
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
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
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
    var<storage, read_write> input1: array<array<Field, 9>>;
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
    inputBuffers: [buffersToReuse.get(fieldsBufferSize)![0]],
    mappedInputs: useInputs ? new Map<number, Uint32Array>([[0, new Uint32Array(input1)]]) : undefined
  }
  const firstHashResult: IGPUResult = { 
    resultBuffers: [buffersToReuse.get(arrayBufferSize)![0]]
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
      inputBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![0] : buffersToReuse.get(arrayBufferSize)![1],
        buffersToReuse.get(aleoMdsBufferSize)![0],
        buffersToReuse.get(aleoRoundConstantsBufferSize)![0]
      ],
      mappedInputs: i == 0 
        ? new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
        : undefined
      }
    const fullRoundResult: IGPUResult = { 
      resultBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![1] : buffersToReuse.get(arrayBufferSize)![0]
      ]
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
      inputBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![0] : buffersToReuse.get(arrayBufferSize)![1],
        buffersToReuse.get(aleoMdsBufferSize)![0],
        buffersToReuse.get(aleoRoundConstantsBufferSize)![0]
      ],
      // mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
    }
    const partialRoundResult: IGPUResult = { 
      resultBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![1] : buffersToReuse.get(arrayBufferSize)![0]
      ]
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
      inputBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![1] : buffersToReuse.get(arrayBufferSize)![0],
        buffersToReuse.get(aleoMdsBufferSize)![0],
        buffersToReuse.get(aleoRoundConstantsBufferSize)![0]
      ],
      // mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(aleoMds)], [2, new Uint32Array(aleoRoundConstants)]])
    }
    const fullRoundResult: IGPUResult = { 
      resultBuffers: [
        i % 2 == 0 ? buffersToReuse.get(arrayBufferSize)![0] : buffersToReuse.get(arrayBufferSize)![1]
      ]
    };
    const fullRoundExecution = new GPUExecution(fullRoundShader, fullRoundInputs, fullRoundResult);
    executionSteps.push(fullRoundExecution);
  }

  // Add final step
  const finalShader: IShaderCode = {
    code: [FieldModulusWGSL, U256WGSL, BLS12_377ParamsWGSL, finalEntry].join('\n'),
    entryPoint: "main"
  };
  const finalInputs: IGPUInput = {
    inputBuffers: [
      buffersToReuse.get(arrayBufferSize)![1],
    ]
  }
  const finalResult: IGPUResult = { 
    resultBuffers: [
      buffersToReuse.get(fieldsBufferSize)![0]
    ]
  };
  const finalExecution = new GPUExecution(finalShader, finalInputs, finalResult);
  executionSteps.push(finalExecution);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: fieldsBufferSize
  };

  return [executionSteps, entryInfo];
}

const addNeededBuffers = (gpu: GPUDevice, size: number, amount: number, bufferMap: Map<number, GPUBuffer[]>): Map<number, GPUBuffer[]> => {
  const currentBuffers = bufferMap.get(size) ?? [];
  if (currentBuffers.length >= amount) {
    return bufferMap;
  }

  const length = currentBuffers.length;
  const neededBuffers = amount - currentBuffers.length;
  for (let i = 0; i < neededBuffers; i++) {
    currentBuffers.push(
      gpu.createBuffer({
        label: `buffer of size ${size} number ${length + i}`,
        size: size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
      })
    );
  }
  bufferMap.set(size, currentBuffers);

  return bufferMap;
}

const getDevice = async () => {
  if (!("gpu" in navigator)) {
    console.log("WebGPU is not supported on this device");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
  if (!adapter) { 
    console.log("Adapter not found");
    return;
  }
  return await adapter.requestDevice();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_poseidon_reuse = field_poseidon_reuse;