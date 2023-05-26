import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldDoubleWGSL } from "../FieldDouble";
import { FieldInverseWGSL } from "../FieldInverse";
import { FieldModulusWGSL } from "../FieldModulus";
import { FieldPoseidonWGSL } from "../FieldPoseidon";
import { FieldSubWGSL } from "../FieldSub";
import { PoseidonConstantsWGSL } from "../PoseidonConstants";
import { entry } from "./entryCreator"

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

      var multiplied = mul_point(ext_p1, EMBEDDED_SCALAR);
      var z_inverse = field_inverse(multiplied.z);
      var result = field_multiply(multiplied.x, z_inverse);

      var hash = aleo_poseidon(result);

      var owner_to_compare = field_sub(owner_field_x[global_id.x], hash);

      output.fields[global_id.x] = field_sub(owner_to_compare, EMBEDDED_ADDRESS_X);
    }
  `;

  const shaderModules = [
    PoseidonConstantsWGSL,
    FieldModulusWGSL,
    FieldAddWGSL,
    FieldPoseidonWGSL,
    FieldSubWGSL,
    FieldDoubleWGSL,
    FieldInverseWGSL,
    CurveWGSL,
    shaderEntry
  ];

  return await entry([cipherTextAffineCoords, encryptedOwnerXs, aleoMds, aleoRoundConstants], shaderModules, 16, 8);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).is_owner = is_owner;