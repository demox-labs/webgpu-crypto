import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { poseidon_multipass_info } from "./aleoPoseidonMultiPass";
import { workgroupSize } from "../../params";
import { GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo, multipassEntryCreator } from "../multipassEntryCreator";
import { U256WGSL } from "../../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { AFFINE_POINT_SIZE, EXT_POINT_SIZE, FIELD_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";

export const is_owner_multi = async (
  cipherTextAffineCoords: gpuU32Inputs,
  encryptedOwnerXs: gpuU32Inputs,
  aleoMds: gpuU32Inputs,
  aleoRoundConstants: gpuU32Inputs,
  scalar: gpuU32Inputs,
  address_x: gpuU32Inputs
  ) => {
  const embededConstantsWGSL = `
    const EMBEDDED_SCALAR: Field = Field(
      array<u32, 8>(${scalar.u32Inputs[0]}, ${scalar.u32Inputs[1]}, ${scalar.u32Inputs[2]}, ${scalar.u32Inputs[3]}, ${scalar.u32Inputs[4]}, ${scalar.u32Inputs[5]}, ${scalar.u32Inputs[6]}, ${scalar.u32Inputs[7]})
    );

    const EMBEDDED_ADDRESS_X: Field = Field(
      array<u32, 8>(${address_x.u32Inputs[0]}, ${address_x.u32Inputs[1]}, ${address_x.u32Inputs[2]}, ${address_x.u32Inputs[3]}, ${address_x.u32Inputs[4]}, ${address_x.u32Inputs[5]}, ${address_x.u32Inputs[6]}, ${address_x.u32Inputs[7]})
    );
  `;

  const baseModules = [
    AleoPoseidonConstantsWGSL,
    U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL,
    CurveWGSL,
    embededConstantsWGSL
  ];
  const numInputs = cipherTextAffineCoords.u32Inputs.length / cipherTextAffineCoords.individualInputSize;
  const fieldArraySize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;

  const postHashEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<Field>;
    @group(0) @binding(1)
    var<storage, read> owner_field_x: array<Field>;
    @group(0) @binding(2)
    var<storage, read_write> output: array<Field>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var hash = input1[global_id.x];
      var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

      var sub = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);

      output[global_id.x] = field_add(sub, U256_ONE);
    }
  `;

  let executionSteps: GPUExecution[] = [];
  const pointScalarPasses = point_mul_multipass(numInputs, cipherTextAffineCoords, [embededConstantsWGSL]);
  executionSteps = executionSteps.concat(pointScalarPasses[0]);

  // Add poseidon rounds
  const poseidonRounds = poseidon_multipass_info({ u32Inputs: new Uint32Array(), individualInputSize: 0}, aleoMds, aleoRoundConstants, false);
  executionSteps = executionSteps.concat(poseidonRounds[0])

  // Add post hash entry
  const postHashShader: IShaderCode = { 
    code: [...baseModules, postHashEntry].join("\n"),
    entryPoint: "main"
  };
  const postHashInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage", "read-only-storage"],
    inputBufferSizes: [fieldArraySize, fieldArraySize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: new Map<number, Uint32Array>([[1, encryptedOwnerXs.u32Inputs]])
  }
  const postHashResultInfo: IGPUResult = { 
    resultBufferTypes: ["storage"],
    resultBufferSizes: [fieldArraySize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  };
  const postHashExecution = new GPUExecution(postHashShader, postHashInputs, postHashResultInfo);
  executionSteps.push(postHashExecution);

  const entryInfo: IEntryInfo = { 
    numInputs: numInputs,
    outputSize: fieldArraySize
  };

  console.log("Execution steps: ", executionSteps);

  return await multipassEntryCreator(executionSteps, entryInfo);
}

const point_mul_multipass = (
  numInputs: number,
  affinePoints: gpuU32Inputs,
  extraBaseShaders: string[]
): [GPUExecution[], IEntryInfo] => {
  let baseModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, CurveWGSL];
  baseModules = baseModules.concat(extraBaseShaders);
  const affinePointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * AFFINE_POINT_SIZE; // 2 fields per affine point
  const scalarsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * FIELD_SIZE;
  const pointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * EXT_POINT_SIZE; // 4 fields per point

  const calcExtendedPointsEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
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
    var<storage, read> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(2)
    var<storage, read_write> updatedScalars: array<Field>;
    @group(0) @binding(3)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];

      var multiplied = mul_point_64_bits_start(point, EMBEDDED_SCALAR);
      output[global_id.x] = multiplied.result;
      updatedScalars[global_id.x] = multiplied.scalar;
      newTemps[global_id.x] = multiplied.temp;
    }
  `;

  const mulPointIntermediateStepEntry = `
    @group(0) @binding(0)
    var<storage, read> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read> scalars: array<Field>;
    @group(0) @binding(2)
    var<storage, read> prevTemps: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(4)
    var<storage, read_write> updatedScalars: array<Field>;
    @group(0) @binding(5)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars[global_id.x];
      var temp = prevTemps[global_id.x];
      var multipliedIntermediate = mul_point_64_bits(point, scalar, temp);
      output[global_id.x] = multipliedIntermediate.result;
      updatedScalars[global_id.x] = multipliedIntermediate.scalar;
      newTemps[global_id.x] = multipliedIntermediate.temp;
    }
  `;

  const mulPointFinalStepEntry = `
    @group(0) @binding(0)
    var<storage, read> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read> scalars: array<Field>;
    @group(0) @binding(2)
    var<storage, read> prevTemps: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars[global_id.x];
      var temp = prevTemps[global_id.x];
      var multiplied = mul_point_64_bits(point, scalar, temp);
      output[global_id.x] = multiplied.result;
    }
  `;

  const inverseStepEntry = `
    @group(0) @binding(0)
    var<storage, read> mulPoints: array<Point>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<Field>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = mulPoints[global_id.x];
      var z_inverse = field_inverse(point.z);
      var result = field_multiply(point.x, z_inverse);

      output[global_id.x] = result;
    }
  `;

  const executionSteps: GPUExecution[] = [];

  // Step 1: Calculate extended points
  const calcExtendedPointsShader: IShaderCode = {
    code: [...baseModules, calcExtendedPointsEntry].join("\n"),
    entryPoint: "main"
  }
  const calcExtendedPointsInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [affinePointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: new Map<number, Uint32Array>([[0, affinePoints.u32Inputs]])
  }
  const calcExtendedPointsResult: IGPUResult = {
    resultBufferTypes: ["storage"],
    resultBufferSizes: [pointsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const calcExtendedPointsStep = new GPUExecution(calcExtendedPointsShader, calcExtendedPointsInputs, calcExtendedPointsResult);
  executionSteps.push(calcExtendedPointsStep);

  // Step 2: Multiply points by scalars
  const firstMulPointShader: IShaderCode = {
    code: [...baseModules, mulPointFirstStepEntry].join("\n"),
    entryPoint: "main"
  }
  const firstMulPointInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [pointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
  }
  const firstMulPointOutputs: IGPUResult = {
    resultBufferTypes: ["storage", "storage", "storage"],
    resultBufferSizes: [pointsBufferSize, scalarsBufferSize, pointsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const firstMulPointStep = new GPUExecution(firstMulPointShader, firstMulPointInputs, firstMulPointOutputs);
  executionSteps.push(firstMulPointStep);
  for (let i = 0; i < 2; i++) {
    const multPointShader: IShaderCode = {
      code: [...baseModules, mulPointIntermediateStepEntry].join("\n"),
      entryPoint: "main"
    }
    const mulPointInputs: IGPUInput = {
      inputBufferTypes: ["read-only-storage", "read-only-storage", "read-only-storage"],
      inputBufferSizes: [pointsBufferSize, scalarsBufferSize, pointsBufferSize],
      inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
    }
    const mulPointResult: IGPUResult = {
      resultBufferTypes: ["storage", "storage", "storage"],
      resultBufferSizes: [pointsBufferSize, scalarsBufferSize, pointsBufferSize],
      resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
    }
    const mulPointStep = new GPUExecution(multPointShader, mulPointInputs, mulPointResult);
    executionSteps.push(mulPointStep);
  }
  const finalMultPointShader: IShaderCode = {
    code: [...baseModules, mulPointFinalStepEntry].join("\n"),
    entryPoint: "main"
  }
  const finalMulPointInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage", "read-only-storage", "read-only-storage"],
    inputBufferSizes: [pointsBufferSize, scalarsBufferSize, pointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
  }
  const finalMulPointResult: IGPUResult = {
    resultBufferTypes: ["storage"],
    resultBufferSizes: [pointsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const finalMulPointStep = new GPUExecution(finalMultPointShader, finalMulPointInputs, finalMulPointResult);
  executionSteps.push(finalMulPointStep);

  // Step 3: Inverse and multiply points
  const inverseShader: IShaderCode = {
    code: [...baseModules, inverseStepEntry].join("\n"),
    entryPoint: "main"
  }
  const inverseInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [pointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
  }
  const inverseResult: IGPUResult = {
    resultBufferTypes: ["storage"],
    resultBufferSizes: [scalarsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const inverseStep = new GPUExecution(inverseShader, inverseInputs, inverseResult);
  executionSteps.push(inverseStep);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: scalarsBufferSize
  }

  return [executionSteps, entryInfo];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).is_owner_multi = is_owner_multi;