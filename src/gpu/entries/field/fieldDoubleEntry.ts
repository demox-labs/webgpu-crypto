import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator";

export const field_double = async (input1: Array<number>) => {
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
      var result = field_double(input1.fields[global_id.x]);
      output.fields[global_id.x] = result;
    }
  `;

  const shaderModules = [U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, shaderEntry];

  return await entry([input1], shaderModules);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_double = field_double;