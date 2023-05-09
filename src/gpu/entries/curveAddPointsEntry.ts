import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldModulusWGSL } from "../FieldModulus";
import { FieldSubWGSL } from "../FieldSub";
import { entry } from "./entryCreator"

export const point_add = async (input1: Array<number>, input2: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> input2: array<AffinePoint>;
    @group(0) @binding(2)
    var<storage, read_write> output: array<Point>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var p1 = input1[global_id.x];
      var p1_t = field_multiply(p1.x, p1.y);
      var p2 = input2[global_id.x];
      var p2_t = field_multiply(p2.x, p2.y);
      var z = U256_ONE;
      var ext_p1 = Point(p1.x, p1.y, p1_t, z);
      var ext_p2 = Point(p2.x, p2.y, p2_t, z);

      output[global_id.x] = add_points(ext_p1, ext_p2);
    }
    `;

  const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, CurveWGSL, shaderEntry];

  return await entry([input1, input2], shaderModules, 16, 32);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_add = point_add;