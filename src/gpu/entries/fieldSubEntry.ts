import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator"
import { FieldSubWGSL } from "../FieldSub";

export const field_sub = async (input1: Array<number>, input2: Array<number>) => {
  const numUintsToPassIn = input1.length / 8;
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
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var sub = field_sub(input1.fields[global_id.x], input2.fields[global_id.x]);
        output.fields[global_id.x].components = sub.components;
      }
    }
    `;

  const shaderModules = [FieldModulusWGSL, FieldSubWGSL, shaderEntry];

  return await entry([input1, input2], shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_sub = field_sub;