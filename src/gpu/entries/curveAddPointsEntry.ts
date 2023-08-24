import { CurveWGSL } from "../Curve";
import { FieldAddWGSL } from "../FieldAdd";
import { FieldDoubleWGSL } from "../FieldDouble";
import { FieldInverseWGSL } from "../FieldInverse";
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
    var<storage, read_write> output: Fields;

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

      var added = add_points(ext_p1, ext_p2);
      var z_inverse = field_inverse(added.z);
      var x_normalized = field_multiply(added.x, z_inverse);

      output.fields[global_id.x] = x_normalized;
    }
    `;

  const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL, shaderEntry];

  const gpuStart = performance.now();
  const res = await entry([input1, input2], shaderModules, 16, 8);
  const gpuEnd = performance.now();
  console.log('Time taken to add points: ', gpuEnd - gpuStart, ' milliseconds');

  return res;
}

export const point_add_single_input = async (input1: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<array<AffinePoint, 2>>;
    @group(0) @binding(1)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var p1 = input1[global_id.x][0];
      var p1_t = field_multiply(p1.x, p1.y);
      var p2 = input1[global_id.x][1];
      var p2_t = field_multiply(p2.x, p2.y);
      var z = U256_ONE;
      var ext_p1 = Point(p1.x, p1.y, p1_t, z);
      var ext_p2 = Point(p2.x, p2.y, p2_t, z);

      var added = add_points(ext_p1, ext_p2);
      var z_inverse = field_inverse(added.z);
      var x_normalized = field_multiply(added.x, z_inverse);

      output.fields[global_id.x] = x_normalized;
    }
    `;

  const shaderModules = [FieldModulusWGSL, FieldAddWGSL, FieldSubWGSL, FieldDoubleWGSL, FieldInverseWGSL, CurveWGSL, shaderEntry];

  const gpuStart = performance.now();
  const res = await entry([input1], shaderModules, 32, 8);
  const gpuEnd = performance.now();
  console.log('Time taken to add points single input: ', gpuEnd - gpuStart, ' milliseconds');
  console.log(res);

  // Time vortex?

  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_add = point_add;