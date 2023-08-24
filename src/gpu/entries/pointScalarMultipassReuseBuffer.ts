import { CurveWGSL } from "../wgsl/Curve";
import { FieldModulusWGSL } from "../wgsl/FieldModulus";
import { U256WGSL } from "../wgsl/U256";
import { BLS12_377ParamsWGSL } from "../wgsl/BLS12-377Params";
import { workgroupSize } from "../params";
import { GPUExecution, IEntryInfo, IGPUInput, IGPUResult, IShaderCode, multipassEntryCreatorReuseBuffers } from "./multipassEntryCreatorBufferReuse";

export const point_mul_multi_reuse = async (input1: Array<number>, input2: Array<number>) => {
  // eslint-disable-next-line
  const gpu = (await getDevice())!;
  const [execution, entryInfo, buffers] = point_mul_multipass_info(gpu, input1.length / 16, input1, input2, true);

  const result = await multipassEntryCreatorReuseBuffers(gpu, execution, entryInfo);

  for (const buffer of buffers) {
    buffer.destroy();
  }
  gpu.destroy();
  return result;
}

export const point_mul_multipass_info = (
  gpu: GPUDevice,
  numInputs: number,
  affinePoints: Array<number>,
  scalars: Array<number>,
  useInputs = true,
): [GPUExecution[], IEntryInfo, GPUBuffer[]] => {
  const baseModules = [FieldModulusWGSL, CurveWGSL, U256WGSL, BLS12_377ParamsWGSL];
  const affinePointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 2; // 2 fields per affine point
  const scalarsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;
  const pointsBufferSize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 4; // 4 fields per point

  const affineSizedBuffers = [
    gpu.createBuffer({
      label: `points buffer 1`,
      size: affinePointsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    }),
  ];
  const pointsSizedBuffers = [
    gpu.createBuffer({
      label: `points buffer 1`,
      size: pointsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    }),
    gpu.createBuffer({
      label: `points buffer 2`,
      size: pointsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    }),
    gpu.createBuffer({
      label: `points buffer 3`,
      size: pointsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    }),
    gpu.createBuffer({
      label: `points buffer 4`,
      size: pointsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    })
  ];
  const fieldSizedBuffers = [
    gpu.createBuffer({
      label: `fields buffer 1`,
      size: scalarsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    }),
    gpu.createBuffer({
      label: `fields buffer 2`,
      size: scalarsBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
    })
  ];

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
    var<storage, read_write> scalars: Fields;
    @group(0) @binding(2)
    var<storage, read_write> output: array<Point>;
    @group(0) @binding(3)
    var<storage, read_write> updatedScalars: Fields;
    @group(0) @binding(4)
    var<storage, read_write> newTemps: array<Point>;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var point = points[global_id.x];
      var scalar = scalars.fields[global_id.x];

      var multiplied = mul_point_64_bits_start(point, scalar);
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
    inputBuffers: [affineSizedBuffers[0]],
    mappedInputs: useInputs
      ? new Map<number, Uint32Array>([[0, new Uint32Array(affinePoints)]])
      : undefined
  }
  const calcExtendedPointsResult: IGPUResult = {
    resultBuffers: [pointsSizedBuffers[0]]
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
      pointsSizedBuffers[0],
      fieldSizedBuffers[0]
    ],
    mappedInputs: new Map<number, Uint32Array>([[1, new Uint32Array(scalars)]])
  }
  const firstMulPointOutputs: IGPUResult = {
    resultBuffers: [pointsSizedBuffers[1], fieldSizedBuffers[1], pointsSizedBuffers[2]]
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
    inputBuffers: [pointsSizedBuffers[1], fieldSizedBuffers[1], pointsSizedBuffers[2]]
  }
  const mulPointResult1: IGPUResult = {
    resultBuffers: [pointsSizedBuffers[0], fieldSizedBuffers[0], pointsSizedBuffers[3]]
  }
  const mulPointStep1 = new GPUExecution(multPointShader, mulPointInputs1, mulPointResult1);
  executionSteps.push(mulPointStep1);

  // intermediate step 2
  const mulPointInputs2: IGPUInput = {
    inputBuffers: [pointsSizedBuffers[0], fieldSizedBuffers[0], pointsSizedBuffers[3]]
  }
  const mulPointResult2: IGPUResult = {
    resultBuffers: [pointsSizedBuffers[1], fieldSizedBuffers[1], pointsSizedBuffers[2]]
  }
  const mulPointStep2 = new GPUExecution(multPointShader, mulPointInputs2, mulPointResult2);
  executionSteps.push(mulPointStep2);
  

  // Add the final step of the execution
  const finalMultPointShader: IShaderCode = {
    code: [...baseModules, mulPointFinalStepEntry].join("\n"),
    entryPoint: "main"
  }
  const finalMulPointInputs: IGPUInput = {
    inputBuffers: [pointsSizedBuffers[1], fieldSizedBuffers[1], pointsSizedBuffers[2]]
  }
  const finalMulPointResult: IGPUResult = {
    resultBuffers: [pointsSizedBuffers[0]]
  }
  const finalMulPointStep = new GPUExecution(finalMultPointShader, finalMulPointInputs, finalMulPointResult);
  executionSteps.push(finalMulPointStep);

  // Step 3: Inverse and multiply points
  const inverseShader: IShaderCode = {
    code: [...baseModules, inverseStepEntry].join("\n"),
    entryPoint: "main"
  }
  const inverseInputs: IGPUInput = {
    inputBuffers: [pointsSizedBuffers[0]]
  }
  const inverseResult: IGPUResult = {
    resultBuffers: [fieldSizedBuffers[0]]
  }
  const inverseStep = new GPUExecution(inverseShader, inverseInputs, inverseResult);
  executionSteps.push(inverseStep);

  const entryInfo: IEntryInfo = {
    numInputs: numInputs,
    outputSize: scalarsBufferSize
  }

  return [executionSteps, entryInfo, affineSizedBuffers.concat(pointsSizedBuffers).concat(fieldSizedBuffers)];
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
(window as any).point_mul_multi_reuse = point_mul_multi_reuse;