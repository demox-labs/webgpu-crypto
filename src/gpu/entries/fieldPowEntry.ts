import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator"
import { FieldPowWGSL } from "../FieldPow";

export const field_pow = async (input1: Array<number>, input2: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: Fields;
    @group(0) @binding(1)
    var<storage, read> input2: Fields;
    @group(0) @binding(2)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      var result = field_pow(input1.fields[global_id.x], input2.fields[global_id.x]);
      output.fields[global_id.x] = result;
    }
    `;

  const shaderModules = [FieldModulusWGSL, FieldPowWGSL, shaderEntry];

  return await entry([input1, input2], shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_pow = field_pow;