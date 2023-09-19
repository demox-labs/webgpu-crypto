import { U256_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator"

export const u256_gt = async (
  input1: gpuU32Inputs,
  input2: gpuU32Inputs,
  batchSize?: number
  ) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<u256>;
    @group(0) @binding(1)
    var<storage, read> input2: array<u256>;
    @group(0) @binding(2)
    var<storage, read_write> output: array<u256>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var gt_result = gt(input1[global_id.x], input2[global_id.x]);
      var result_as_uint_256: u256 = u256(array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0));
      if (gt_result) {
        result_as_uint_256.components[7u] = 1u;
      }
      output[global_id.x] = result_as_uint_256;
    }
    `;

  const shaderModules = [U256WGSL, shaderEntry];

  return await batchedEntry([input1, input2], shaderModules.join(''), U256_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_gt = u256_gt;