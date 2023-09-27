import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { CurveType, getCurveBaseFunctionsWGSL, getCurveParamsWGSL, workgroupSize } from "../../curveSpecific";
import { IEntryInfo, IGPUInput, IGPUResult, IShaderCode, multipassEntryCreator } from "../multipassEntryCreator";
import { GPUExecution } from "../multipassEntryCreator";
import { U256WGSL } from "../../wgsl/U256";
import { AFFINE_POINT_SIZE, EXT_POINT_SIZE, FIELD_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";
import { prune } from "../../prune";

export const point_mul_multi = async (input1: gpuU32Inputs, input2: gpuU32Inputs) => {
  const [execution, entryInfo] = point_mul_multipass_info(input1.u32Inputs.length / input1.individualInputSize, input1, input2, true);

  return await multipassEntryCreator(execution, entryInfo);
}

export const point_mul_multipass_info = (
  numInputs: number,
  affinePoints: gpuU32Inputs,
  scalars: gpuU32Inputs,
  useInputs = true,
): [GPUExecution[], IEntryInfo] => {
  const curve = CurveType.BLS12_377;
  const baseModules = [
    U256WGSL,
    getCurveParamsWGSL(curve),
    FieldModulusWGSL,
    getCurveBaseFunctionsWGSL(curve),
    CurveWGSL
  ];
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
    var<storage, read> scalars: array<Field>;
    @group(0) @binding(2)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> updatedScalars: array<Field>;
    @group(0) @binding(4)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars[global_id.x];

      var multiplied = mul_point_64_bits_start(point, scalar);
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
  const calcExtendedPointsShaderCode = prune(
    baseModules.join(''),
    ['field_multiply']
  ) + calcExtendedPointsEntry;
  const calcExtendedPointsShader: IShaderCode = {
    code: calcExtendedPointsShaderCode,
    entryPoint: "main"
  }
  const calcExtendedPointsInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage"],
    inputBufferSizes: [affinePointsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: useInputs
      ? new Map<number, Uint32Array>([[0, affinePoints.u32Inputs]])
      : undefined
  }
  const calcExtendedPointsResult: IGPUResult = {
    resultBufferTypes: ["storage"],
    resultBufferSizes: [pointsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const calcExtendedPointsStep = new GPUExecution(calcExtendedPointsShader, calcExtendedPointsInputs, calcExtendedPointsResult);
  executionSteps.push(calcExtendedPointsStep);

  // Step 2: Multiply points by scalars
  const mulPointFirstStepEntryShaderCode = prune(
    baseModules.join(''),
    ['mul_point_64_bits_start']
  ) + mulPointFirstStepEntry;
  const firstMulPointShader: IShaderCode = {
    code: mulPointFirstStepEntryShaderCode,
    entryPoint: "main"
  }
  const firstMulPointInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage", "read-only-storage"],
    inputBufferSizes: [pointsBufferSize, scalarsBufferSize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: new Map<number, Uint32Array>([[1, scalars.u32Inputs]])
  }
  const firstMulPointOutputs: IGPUResult = {
    resultBufferTypes: ["storage", "storage", "storage"],
    resultBufferSizes: [pointsBufferSize, scalarsBufferSize, pointsBufferSize],
    resultBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC]
  }
  const firstMulPointStep = new GPUExecution(firstMulPointShader, firstMulPointInputs, firstMulPointOutputs);
  executionSteps.push(firstMulPointStep);
  for (let i = 0; i < 2; i++) {
    const mulPointIntermediateStepEntryShaderCode = prune(
      baseModules.join(''),
      ['mul_point_64_bits']
    ) + mulPointIntermediateStepEntry;
    const multPointShader: IShaderCode = {
      code: mulPointIntermediateStepEntryShaderCode,
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
  const mulPointFinalStepShaderCode = prune(
    baseModules.join(''),
    ['mul_point_64_bits']
  ) + mulPointFinalStepEntry;
  const finalMultPointShader: IShaderCode = {
    code: mulPointFinalStepShaderCode,
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
  const inverseStepShaderCode = prune(
    baseModules.join(''),
    ['field_inverse', 'field_multiply']
  ) + inverseStepEntry;
  const inverseShader: IShaderCode = {
    code: inverseStepShaderCode,
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
(window as any).point_mul_multi = point_mul_multi;