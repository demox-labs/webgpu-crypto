import { FIELD_SIZE } from "../../U32Sizes";
import { CurveType, getCurveBaseFunctionsWGSL, getCurveParamsWGSL } from "../../curveSpecific";
import { gpuU32Inputs } from "../../utils";
import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator"

export const point_add = async (
  curve: CurveType,
  points_a: gpuU32Inputs,
  points_b: gpuU32Inputs,
  batchSize?: number
  ) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> input2: array<AffinePoint>;
    @group(0) @binding(2)
    var<storage, read_write> output: array<Field>;

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
      var x_normalized = normalize_x(added.x, added.z);

      output[global_id.x] = x_normalized;
    }
    `;

  const curveParams = getCurveParamsWGSL(curve);
  const curveBaseFunctions = getCurveBaseFunctionsWGSL(curve);

  const shaderModules = [U256WGSL, curveParams, FieldModulusWGSL, curveBaseFunctions, CurveWGSL, shaderEntry];

  return await batchedEntry([points_a, points_b], shaderModules.join(''), FIELD_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_add = point_add;