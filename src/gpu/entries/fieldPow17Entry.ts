import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator";

export const field_pow_by_17 = async (input1: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read_write> output: u256s;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = field_pow_by_17(input1.u256s[global_id.x]);
      output.u256s[global_id.x] = result;
    }
  `;

  const shaderModules = [FieldModulusWGSL, shaderEntry];

  return await entry([input1], shaderModules);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_pow_by_17 = field_pow_by_17;