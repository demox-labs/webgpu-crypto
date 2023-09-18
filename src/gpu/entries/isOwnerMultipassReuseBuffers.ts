import { CurveWGSL } from "../wgsl/Curve";
import { FieldModulusWGSL } from "../wgsl/FieldModulus";
import { U256WGSL } from "../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../wgsl/BLS12-377Params";
import { AleoPoseidonConstantsWGSL } from "../wgsl/AleoPoseidonConstants";
import { poseidon_multipass_info_buffers } from "./poseidonMultiPassBufferReuse";
import { CurveType, getCurveBaseFunctionsWGSL, getCurveParamsWGSL, workgroupSize } from "../curveSpecific";
import { GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo, multipassEntryCreatorReuseBuffers } from "./multipassEntryCreatorBufferReuse";
import { AFFINE_POINT_SIZE, EXT_POINT_SIZE, FIELD_SIZE } from "../U32Sizes";

export const is_owner_multi_reuse_buffers = async (
  cipherTextAffineCoords: Array<number>,
  encryptedOwnerXs: Array<number>,
  aleoMds: Array<number>,
  aleoRoundConstants: Array<number>,
  scalar: Array<number>,
  address_x: Array<number>
  ) => {
  const gpu = await getDevice();

  const embededConstantsWGSL = `
    const EMBEDDED_SCALAR: Field = Field(
      array<u32, 8>(${scalar[0]}, ${scalar[1]}, ${scalar[2]}, ${scalar[3]}, ${scalar[4]}, ${scalar[5]}, ${scalar[6]}, ${scalar[7]})
    );

    const EMBEDDED_ADDRESS_X: Field = Field(
      array<u32, 8>(${address_x[0]}, ${address_x[1]}, ${address_x[2]}, ${address_x[3]}, ${address_x[4]}, ${address_x[5]}, ${address_x[6]}, ${address_x[7]})
    );
  `;

  // Maps size to buffers of that size. Needed to reuse buffers.
  const buffersMap = new Map<number, GPUBuffer[]>();

  const curve = CurveType.BLS12_377
  const baseModules = [
    AleoPoseidonConstantsWGSL,
    FieldModulusWGSL,
    U256WGSL,
    getCurveParamsWGSL(curve),
    getCurveBaseFunctionsWGSL(curve),
    CurveWGSL,
    embededConstantsWGSL
  ];
  const numInputs = cipherTextAffineCoords.length / 16;
  const fieldArraySize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;

  const postHashEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<Field>;
    @group(0) @binding(1)
    var<storage, read_write> owner_field_x: array<Field>;
    @group(0) @binding(2)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var hash = input1[global_id.x];
      var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

      var sub = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);

      output.fields[global_id.x] = field_add(sub, U256_ONE);
    }
  `;

  let executionSteps: GPUExecution[] = [];
  const pointScalarPasses = point_mul_multipass(gpu, numInputs, cipherTextAffineCoords, [embededConstantsWGSL], buffersMap);
  executionSteps = executionSteps.concat(pointScalarPasses[0]);

  // Add poseidon rounds
  const poseidonRounds = poseidon_multipass_info_buffers(gpu, numInputs, new Array<number>(), aleoMds, aleoRoundConstants, buffersMap, false);
  executionSteps = executionSteps.concat(poseidonRounds[0])

  // Add post hash entry
  const postHashShader: IShaderCode = { 
    code: [...baseModules, postHashEntry].join("\n"),
    entryPoint: "main"
  };
  addNeededBuffers(gpu, fieldArraySize, 4, buffersMap);
  
  const postHashInputs: IGPUInput = {
    inputBuffers: [
      buffersMap.get(fieldArraySize)![0],
      buffersMap.get(fieldArraySize)![2]
    ],
    mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(encryptedOwnerXs)]])
  }
  const postHashResultInfo: IGPUResult = {
    resultBuffers: [buffersMap.get(fieldArraySize)![3]]
  };
  const postHashExecution = new GPUExecution(postHashShader, postHashInputs, postHashResultInfo);
  executionSteps.push(postHashExecution);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: fieldArraySize
  };

  const res = await multipassEntryCreatorReuseBuffers(gpu, executionSteps, entryInfo);
  for (const buffer of buffersMap.values()) {
    for (const b of buffer) {
      b.destroy();
    }
  }
  return res;
}

const point_mul_multipass = (
  gpu: GPUDevice,
  numInputs: number,
  affinePoints: Array<number>,
  extraBaseShaders: string[],
  buffersToReuse: Map<number, GPUBuffer[]>
): [GPUExecution[], IEntryInfo] => {
  let baseModules = [FieldModulusWGSL, U256WGSL, BLS12_377ParamsWGSL, CurveWGSL];
  baseModules = baseModules.concat(extraBaseShaders);

  const affinePointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * AFFINE_POINT_SIZE;
  const scalarsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;
  const pointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * EXT_POINT_SIZE;

  // Create all of the buffers needed for the passes
  addNeededBuffers(gpu, affinePointsBufferSize, 1, buffersToReuse);
  addNeededBuffers(gpu, pointsBufferSize, 4, buffersToReuse);
  addNeededBuffers(gpu, scalarsBufferSize, 2, buffersToReuse);

  const calcExtendedPointsEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var p1 = input1[global_id.x];
      var p1_t = field_multiply(p1.x, p1.y);
      var z = U256_ONE;
      var ext_p1 = Point(p1.x, p1.y, p1_t, z);

      output[global_id.x] = ext_p1;
    }
  `;

  const mulPointFirstStepEntry = `
    @group(0) @binding(0)
    var<storage, read_write> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(2)
    var<storage, read_write> updatedScalars: Fields;
    @group(0) @binding(3)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];

      var multiplied = mul_point_64_bits_start(point, EMBEDDED_SCALAR);
      output[global_id.x] = multiplied.result;
      updatedScalars.fields[global_id.x] = multiplied.scalar;
      newTemps[global_id.x] = multiplied.temp;
    }
  `;

  const mulPointIntermediateStepEntry = `
    @group(0) @binding(0)
    var<storage, read_write> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> scalars: Fields;
    @group(0) @binding(2)
    var<storage, read_write> prevTemps: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(4)
    var<storage, read_write> updatedScalars: Fields;
    @group(0) @binding(5)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars.fields[global_id.x];
      var temp = prevTemps[global_id.x];
      var multipliedIntermediate = mul_point_64_bits(point, scalar, temp);
      output[global_id.x] = multipliedIntermediate.result;
      updatedScalars.fields[global_id.x] = multipliedIntermediate.scalar;
      newTemps[global_id.x] = multipliedIntermediate.temp;
    }
  `;

  const mulPointFinalStepEntry = `
    @group(0) @binding(0)
    var<storage, read_write> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> scalars: Fields;
    @group(0) @binding(2)
    var<storage, read_write> prevTemps: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars.fields[global_id.x];
      var temp = prevTemps[global_id.x];
      var multiplied = mul_point_64_bits(point, scalar, temp);
      output[global_id.x] = multiplied.result;
    }
  `;

  const inverseStepEntry = `
    @group(0) @binding(0)
    var<storage, read_write> mulPoints: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = mulPoints[global_id.x];
      var z_inverse = field_inverse(point.z);
      var result = field_multiply(point.x, z_inverse);

      output.fields[global_id.x] = result;
    }
  `;

  const executionSteps: GPUExecution[] = [];

  // Step 1: Calculate extended points
  const calcExtendedPointsShader: IShaderCode = {
    code: [...baseModules, calcExtendedPointsEntry].join("\n"),
    entryPoint: "main"
  }
  const calcExtendedPointsInputs: IGPUInput = {
    inputBuffers: [buffersToReuse.get(affinePointsBufferSize)![0]],
    mappedInputs: new Map<number, Uint32Array>([[0, new Uint32Array(affinePoints)]])
  }
  const calcExtendedPointsResult: IGPUResult = {
    resultBuffers: [buffersToReuse.get(pointsBufferSize)![0]]
  }
  const calcExtendedPointsStep = new GPUExecution(calcExtendedPointsShader, calcExtendedPointsInputs, calcExtendedPointsResult);
  executionSteps.push(calcExtendedPointsStep);

  // Step 2: Multiply points by scalars
  const firstMulPointShader: IShaderCode = {
    code: [...baseModules, mulPointFirstStepEntry].join("\n"),
    entryPoint: "main"
  }
  const firstMulPointInputs: IGPUInput = {
    inputBuffers: [
      buffersToReuse.get(pointsBufferSize)![0]
    ]
  }
  const firstMulPointOutputs: IGPUResult = {
    resultBuffers: [
      buffersToReuse.get(pointsBufferSize)![1],
      buffersToReuse.get(scalarsBufferSize)![0],
      buffersToReuse.get(pointsBufferSize)![2]
    ]
  }
  const firstMulPointStep = new GPUExecution(firstMulPointShader, firstMulPointInputs, firstMulPointOutputs);
  executionSteps.push(firstMulPointStep);

  // Add the intermediate steps of the execution
  const multPointShader: IShaderCode = {
    code: [...baseModules, mulPointIntermediateStepEntry].join("\n"),
    entryPoint: "main"
  }
  // intermediate step 1
  const mulPointInputs1: IGPUInput = {
    inputBuffers: [
      buffersToReuse.get(pointsBufferSize)![1],
      buffersToReuse.get(scalarsBufferSize)![0],
      buffersToReuse.get(pointsBufferSize)![2]
    ]
  }
  const mulPointResult1: IGPUResult = {
    resultBuffers: [
      buffersToReuse.get(pointsBufferSize)![0],
      buffersToReuse.get(scalarsBufferSize)![1],
      buffersToReuse.get(pointsBufferSize)![3]
    ]
  }
  const mulPointStep1 = new GPUExecution(multPointShader, mulPointInputs1, mulPointResult1);
  executionSteps.push(mulPointStep1);

  // intermediate step 2
  const mulPointInputs2: IGPUInput = {
    inputBuffers: [
      buffersToReuse.get(pointsBufferSize)![0],
      buffersToReuse.get(scalarsBufferSize)![1],
      buffersToReuse.get(pointsBufferSize)![3]
    ]
  }
  const mulPointResult2: IGPUResult = {
    resultBuffers: [
      buffersToReuse.get(pointsBufferSize)![1],
      buffersToReuse.get(scalarsBufferSize)![0],
      buffersToReuse.get(pointsBufferSize)![2]
    ]
  }
  const mulPointStep2 = new GPUExecution(multPointShader, mulPointInputs2, mulPointResult2);
  executionSteps.push(mulPointStep2);

  const finalMultPointShader: IShaderCode = {
    code: [...baseModules, mulPointFinalStepEntry].join("\n"),
    entryPoint: "main"
  }
  const finalMulPointInputs: IGPUInput = {
    inputBuffers: [
      buffersToReuse.get(pointsBufferSize)![1],
      buffersToReuse.get(scalarsBufferSize)![0],
      buffersToReuse.get(pointsBufferSize)![2]
    ]
  }
  const finalMulPointResult: IGPUResult = {
    resultBuffers: [buffersToReuse.get(pointsBufferSize)![0]]
  }
  const finalMulPointStep = new GPUExecution(finalMultPointShader, finalMulPointInputs, finalMulPointResult);
  executionSteps.push(finalMulPointStep);

  // Step 3: Inverse and multiply points
  const inverseShader: IShaderCode = {
    code: [...baseModules, inverseStepEntry].join("\n"),
    entryPoint: "main"
  }
  const inverseInputs: IGPUInput = {
    inputBuffers: [buffersToReuse.get(pointsBufferSize)![0]]
  }
  const inverseResult: IGPUResult = {
    resultBuffers: [buffersToReuse.get(scalarsBufferSize)![0]]
  }
  const inverseStep = new GPUExecution(inverseShader, inverseInputs, inverseResult);
  executionSteps.push(inverseStep);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: scalarsBufferSize
  }

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
    throw new Error("WebGPU is not supported on this device");
  }

  const adapter = await navigator.gpu.requestAdapter({powerPreference: "high-performance"});
  if (!adapter) { 
    console.log("Adapter not found");
    throw new Error("Adapter not found");
  }
  return await adapter.requestDevice();
}