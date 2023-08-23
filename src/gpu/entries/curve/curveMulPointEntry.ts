import { AFFINE_POINT_SIZE, FIELD_SIZE } from "../../U32Sizes";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator"

export const point_mul = async (input1: Array<number>, input2: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> input2: Fields;
    @group(0) @binding(2)
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

      var scalar = input2.fields[global_id.x];

      var multiplied = mul_point(ext_p1, scalar);
      var z_inverse = field_inverse(multiplied.z);
      var result = field_multiply(multiplied.x, z_inverse);

      output.fields[global_id.x] = result;
    }
    `;

  const shaderModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, CurveWGSL, shaderEntry];

  return await entry([input1, input2], shaderModules, AFFINE_POINT_SIZE, FIELD_SIZE);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_mul = point_mul;