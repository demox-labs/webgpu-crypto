import { FIELD_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";
import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator"

export const point_double = async (
  points: gpuU32Inputs,
  batchSize?: number
  ) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
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

      var doubled = double_point(ext_p1);
      var z_inverse = field_inverse(doubled.z);
      var x_normalized = field_multiply(doubled.x, z_inverse);

      output[global_id.x] = x_normalized;
    }
    `;

  const shaderModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, CurveWGSL, shaderEntry];

  return await batchedEntry([points], shaderModules, FIELD_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_double = point_double;