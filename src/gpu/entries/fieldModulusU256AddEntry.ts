import { FieldModulusWGSL } from "../FieldModulus";
import { entry } from "./entryCreator"

export const u256_add = async (input1: Uint32Array, input2: Uint32Array) => {
  const numUintsToPassIn = input1.length / 8;
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
      // Avoid accessing the buffer out of bounds
      if (global_id.x >= ${numUintsToPassIn}) {
        return;
      }
      for (var i = 0u; i < ${numUintsToPassIn}; i = i + 1u) {
        var sum = u256_add(input1.u256s[global_id.x], input2.u256s[global_id.x]);
        output.u256s[global_id.x].components = sum.components;
      }
    }
    `;

  const shaderModules = [FieldModulusWGSL, shaderEntry];

  return await entry(input1, input2, shaderModules);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).u256_add = u256_add;