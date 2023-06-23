import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldDoubleWGSL } from "../FieldDouble";
import { FieldInverseWGSL } from "../FieldInverse";
import { FieldModulusWGSL } from "../FieldModulus";
import { FieldSubWGSL } from "../FieldSub";
import { PoseidonConstantsWGSL } from "../PoseidonConstants";
import { poseidon_multipass_info } from "./poseidonMultiPass";
import { workgroupSize } from "../params";
import { GPUExecution, IShaderCode, IGPUInput, IGPUResult, IEntryInfo, multipassEntryCreator } from "./multipassEntryCreator";

export const is_owner_multi = async (
  cipherTextAffineCoords: Array<number>,
  encryptedOwnerXs: Array<number>,
  aleoMds: Array<number>,
  aleoRoundConstants: Array<number>,
  scalar: Array<number>,
  address_x: Array<number>
  ) => {
  const embededConstantsWGSL = `
    const EMBEDDED_SCALAR: Field = Field(
      array<u32, 8>(${scalar[0]}, ${scalar[1]}, ${scalar[2]}, ${scalar[3]}, ${scalar[4]}, ${scalar[5]}, ${scalar[6]}, ${scalar[7]})
    );

    const EMBEDDED_ADDRESS_X: Field = Field(
      array<u32, 8>(${address_x[0]}, ${address_x[1]}, ${address_x[2]}, ${address_x[3]}, ${address_x[4]}, ${address_x[5]}, ${address_x[6]}, ${address_x[7]})
    );
  `;

  const baseModules = [
    PoseidonConstantsWGSL,
    FieldModulusWGSL,
    FieldAddWGSL,
    FieldSubWGSL,
    FieldDoubleWGSL,
    FieldInverseWGSL,
    CurveWGSL,
    embededConstantsWGSL
  ];
  const numInputs = cipherTextAffineCoords.length / 16;
  const fieldArraySize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;

  const postHashEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<Field>;
    @group(0) @binding(1)
    var<storage, read> owner_field_x: array<Field>;
    @group(0) @binding(2)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var hash = input1[global_id.x];
      var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

      var sub = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);

      output.fields[global_id.x] = field_add(sub, U256_ONE);
    }
  `;

  let executionSteps: GPUExecution[] = [];
  const pointScalarPasses = point_mul_multipass(numInputs, cipherTextAffineCoords, [embededConstantsWGSL]);
  executionSteps = executionSteps.concat(pointScalarPasses[0]);

  // Add poseidon rounds
  const poseidonRounds = poseidon_multipass_info(numInputs, new Array<number>(), aleoMds, aleoRoundConstants, false);
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
    mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(encryptedOwnerXs)]])
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
  affinePoints: Array<number>,
  extraBaseShaders: string[]
): [GPUExecution[], IEntryInfo] => {
  let baseModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL];
  baseModules = baseModules.concat(extraBaseShaders);
  const affinePointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 2; // 2 fields per affine point
  const scalarsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const pointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 4; // 4 fields per point

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
    var<storage, read> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read> scalars: Fields;
    @group(0) @binding(2)
    var<storage, read> prevTemps: array<Point>;
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
    var<storage, read> points: array<Point>;
    @group(0) @binding(1)
    var<storage, read> scalars: Fields;
    @group(0) @binding(2)
    var<storage, read> prevTemps: array<Point>;
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
    var<storage, read> mulPoints: array<Point>;
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
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [affinePointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: new Map<number, Uint32Array>([[0, new Uint32Array(affinePoints)]])
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