import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { AleoPoseidonWGSL } from "../../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator"
import { FIELD_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";
import { CurveType, getCurveBaseFunctionsWGSL, getCurveParamsWGSL } from "../../curveSpecific";

export const is_owner = async (
  cipherTextAffineCoords: gpuU32Inputs,
  encryptedOwnerXs: gpuU32Inputs,
  aleoMds: gpuU32Inputs,
  aleoRoundConstants: gpuU32Inputs,
  scalar: gpuU32Inputs,
  address_x: gpuU32Inputs,
  batchSize?: number
  ) => {
  const shaderEntry = `
    const EMBEDDED_SCALAR: Field = Field(
      array<u32, 8>(${scalar.u32Inputs[0]}, ${scalar.u32Inputs[1]}, ${scalar.u32Inputs[2]}, ${scalar.u32Inputs[3]}, ${scalar.u32Inputs[4]}, ${scalar.u32Inputs[5]}, ${scalar.u32Inputs[6]}, ${scalar.u32Inputs[7]})
    );

    const EMBEDDED_ADDRESS_X: Field = Field(
      array<u32, 8>(${address_x.u32Inputs[0]}, ${address_x.u32Inputs[1]}, ${address_x.u32Inputs[2]}, ${address_x.u32Inputs[3]}, ${address_x.u32Inputs[4]}, ${address_x.u32Inputs[5]}, ${address_x.u32Inputs[6]}, ${address_x.u32Inputs[7]})
    );

    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> owner_field_x: array<Field>;
    @group(0) @binding(2)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(3)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>, 39>;
    @group(0) @binding(4)
    var<storage, read_write> output: array<Field>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var p1 = input1[global_id.x];
      var p1_t = field_multiply(p1.x, p1.y);
      var z = U256_ONE;
      var ext_p1 = Point(p1.x, p1.y, p1_t, z);

      var multiplied = mul_point_windowed(ext_p1, EMBEDDED_SCALAR);
      var z_inverse = field_inverse(multiplied.z);
      var result = field_multiply(multiplied.x, z_inverse);

      var hash = aleo_poseidon(result);

      var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

      output[global_id.x] = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);
    }
  `;

  const curve = CurveType.BLS12_377;

  const shaderModules = [
    U256WGSL,
    AleoPoseidonConstantsWGSL,
    getCurveParamsWGSL(curve),
    FieldModulusWGSL,
    AleoPoseidonWGSL,
    getCurveBaseFunctionsWGSL(curve),
    CurveWGSL,
    shaderEntry
  ];

  return await batchedEntry([cipherTextAffineCoords, encryptedOwnerXs, aleoMds, aleoRoundConstants], shaderModules, FIELD_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).is_owner = is_owner;