import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator"

export const u256_subw = async (input1: Array<number>, input2: Array<number>) => {
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
      var sub = u256_subw(input1.u256s[global_id.x], input2.u256s[global_id.x]);
      output.u256s[global_id.x].components = sub.components;
    }
    `;

  const shaderModules = [FieldModulusWGSL, shaderEntry];

  return await entry([input1, input2], shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_subw = u256_subw;