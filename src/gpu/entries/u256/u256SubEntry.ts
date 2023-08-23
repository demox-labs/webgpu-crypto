import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator"

export const u256_sub = async (input1: Array<number>, input2: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read> input2: u256s;
    @group(0) @binding(2)
    var<storage, read_write> output: u256s;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var sub = u256_sub(input1.u256s[global_id.x], input2.u256s[global_id.x]);
      output.u256s[global_id.x].components = sub.components;
    }
    `;

  const shaderModules = [U256WGSL, shaderEntry];

  return await entry([input1, input2], shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_sub = u256_sub;