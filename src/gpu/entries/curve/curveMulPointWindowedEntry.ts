import { FIELD_SIZE } from "../../U32Sizes";
import { CurveType, getCurveBaseFunctionsWGSL, getCurveParamsWGSL } from "../../curveSpecific";
import { gpuU32Inputs } from "../../utils";
import { CurveWGSL } from "../../wgsl/Curve";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator"

export const point_mul_windowed = async (
  curve: CurveType,
  input1: gpuU32Inputs,
  input2: gpuU32Inputs,
  batchSize?: number
  ) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<AffinePoint>;
    @group(0) @binding(1)
    var<storage, read> input2: array<Field>;
    @group(0) @binding(2)
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

      var scalar = input2[global_id.x];

      var multiplied = mul_point_windowed(ext_p1, scalar);
      var z_inverse = field_inverse(multiplied.z);
      var result = field_multiply(multiplied.x, z_inverse);

      output[global_id.x] = result;
    }
    `;

  const shaderModules = [
    U256WGSL,
    getCurveParamsWGSL(curve),
    FieldModulusWGSL,
    getCurveBaseFunctionsWGSL(curve),
    CurveWGSL,
    shaderEntry
  ];

  return await batchedEntry([input1, input2], shaderModules.join(''), FIELD_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).point_mul_windowed = point_mul_windowed;