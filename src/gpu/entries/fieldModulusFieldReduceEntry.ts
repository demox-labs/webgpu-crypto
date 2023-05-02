import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator"

export const field_reduce = async (input1: Array<number>) => {
  const numUintsToPassIn = input1.length / 8;
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read_write> output: Fields;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id)
      global_id : vec3<u32>
    ) {
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var result = field_reduce(input1.u256s[global_id.x]);
        output.fields[global_id.x] = result;
      }
    }
    `;

  const shaderModules = [FieldModulusWGSL, shaderEntry];

  return await entry([input1], shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_reduce = field_reduce;