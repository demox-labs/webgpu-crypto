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
  const embededScalarsWGSL = `
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
    embededScalarsWGSL
  ];
  const numInputs = cipherTextAffineCoords.length / 16;
  const affinePointArraySize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8 * 2;
  const fieldArraySize = Uint32Array.BYTES_PER_ELEMENT * numInputs * 8;

  // const shaderEntry = `
  //   @group(0) @binding(0)
  //   var<storage, read> input1: array<AffinePoint>;
  //   @group(0) @binding(1)
  //   var<storage, read> owner_field_x: array<Field>;
  //   @group(0) @binding(2)
  //   var<storage, read> aleoMds: array<array<u256, 9>, 9>;
  //   @group(0) @binding(3)
  //   var<storage, read> aleoRoundConstants: array<array<u256, 9>, 39>;
  //   @group(0) @binding(4)
  //   var<storage, read_write> output: Fields;

  //   @compute @workgroup_size(64)
  //   fn main(
  //     @builtin(global_invocation_id)
  //     global_id : vec3<u32>
  //   ) {
  //     var p1 = input1[global_id.x];
  //     var p1_t = field_multiply(p1.x, p1.y);
  //     var z = U256_ONE;
  //     var ext_p1 = Point(p1.x, p1.y, p1_t, z);

  //     var multiplied = mul_point(ext_p1, EMBEDDED_SCALAR);
  //     var z_inverse = field_inverse(multiplied.z);
  //     var result = field_multiply(multiplied.x, z_inverse);

  //     var hash = aleo_poseidon(result);

  //     var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

  //     output.fields[global_id.x] = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);
  //   }
  // `;

  const pointScalarEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> owner_field_x: array<Field>;
    @group(0) @binding(2)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(${workgroupSize})
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var p1 = input1[global_id.x];
      var p1_t = field_multiply(p1.x, p1.y);
      var z = U256_ONE;
      var ext_p1 = Point(p1.x, p1.y, p1_t, z);

      var multiplied = mul_point(ext_p1, EMBEDDED_SCALAR);
      var z_inverse = field_inverse(multiplied.z);
      output.fields[global_id.x] = field_multiply(multiplied.x, z_inverse);
    }
  `;

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

      output.fields[global_id.x] = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);
    }
  `;

  let executionSteps: GPUExecution[] = [];
  
  // Add point scalar entry
  const pointScalarShader: IShaderCode = {
    code: [...baseModules, pointScalarEntry].join("\n"),
    entryPoint: "main"
  };
  const pointScalarInputs: IGPUInput = {
    inputBufferTypes: ["read-only-storage", "read-only-storage"],
    inputBufferSizes: [affinePointArraySize, fieldArraySize],
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST],
    mappedInputs: new Map<number, Uint32Array>([[0, new Uint32Array(cipherTextAffineCoords)], [1, new Uint32Array(encryptedOwnerXs)]])
  }
  const pointScalarResultInfo: IGPUResult = {
    resultBufferType: "storage",
    resultBufferSize: fieldArraySize,
    resultBufferUsage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  }
  const pointScalarExecution = new GPUExecution(pointScalarShader, pointScalarInputs, pointScalarResultInfo);
  executionSteps.push(pointScalarExecution);

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
    inputBufferUsages: [GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST]
  }
  const postHashResultInfo: IGPUResult = { 
    resultBufferType: "storage",
    resultBufferSize: fieldArraySize,
    resultBufferUsage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).is_owner_multi = is_owner_multi;