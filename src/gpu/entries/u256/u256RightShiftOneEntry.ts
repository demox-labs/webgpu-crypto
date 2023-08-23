import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator";

export const u256_rs1 = async (input1: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: Fields;
    @group(0) @binding(1)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var result = u256_rs1(input1.fields[global_id.x]);
      output.fields[global_id.x] = result;
    }
  `;

  const shaderModules = [U256WGSL, shaderEntry];

  return await entry([input1], shaderModules);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_rs1 = u256_rs1;