import { U256_SIZE } from "../../U32Sizes";
import { gpuU32Inputs } from "../../utils";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator";

export const u256_right_shift = async (
  input1: gpuU32Inputs,
  input2: number,
  batchSize?: number
  ) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: array<u256>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<u256>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var result = u256_right_shift(input1[global_id.x], ${input2}u);
      output[global_id.x] = result;
    }
  `;

  const shaderModules = [U256WGSL, shaderEntry];

  return await batchedEntry([input1], shaderModules.join(''), U256_SIZE, batchSize);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_right_shift = u256_right_shift;