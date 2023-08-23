import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { AleoPoseidonWGSL } from "../../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator"
import { AFFINE_POINT_SIZE, FIELD_SIZE } from "../../U32Sizes";

export const is_owner = async (
  cipherTextAffineCoords: Array<number>,
  encryptedOwnerXs: Array<number>,
  aleoMds: Array<number>,
  aleoRoundConstants: Array<number>,
  scalar: Array<number>,
  address_x: Array<number>
  ) => {
  const shaderEntry = `
    const EMBEDDED_SCALAR: Field = Field(
      array<u32, 8>(${scalar[0]}, ${scalar[1]}, ${scalar[2]}, ${scalar[3]}, ${scalar[4]}, ${scalar[5]}, ${scalar[6]}, ${scalar[7]})
    );

    const EMBEDDED_ADDRESS_X: Field = Field(
      array<u32, 8>(${address_x[0]}, ${address_x[1]}, ${address_x[2]}, ${address_x[3]}, ${address_x[4]}, ${address_x[5]}, ${address_x[6]}, ${address_x[7]})
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
    var<storage, read_write> output: Fields;

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

      output.fields[global_id.x] = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);
    }
  `;

  const shaderModules = [
    AleoPoseidonConstantsWGSL,
    U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL,
    AleoPoseidonWGSL,
    CurveWGSL,
    shaderEntry
  ];

  return await entry([cipherTextAffineCoords, encryptedOwnerXs, aleoMds, aleoRoundConstants], shaderModules, AFFINE_POINT_SIZE, FIELD_SIZE);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).is_owner = is_owner;