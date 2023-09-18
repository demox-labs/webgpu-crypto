import { FIELD_SIZE } from "../../U32Sizes";
import { CurveType, getCurveParamsWGSL } from "../../curveSpecific";
import { gpuU32Inputs } from "../../utils";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { U256WGSL } from "../../wgsl/U256";
import { batchedEntry } from "../entryCreator";

export const field_entry = async (
  wgslFunction: string,
  curve: CurveType,
  inputs: gpuU32Inputs[],
  batchSize?: number
  ) => {
    let inputBindings = '';
    let args = '';
    for (let i = 0; i < inputs.length; i++) {
      inputBindings += `@group(0) @binding(${i})\n
        var<storage, read> input${i}: array<Field>;\n`;
      args += `input${i}[global_id.x],`
    }
    // drop end comma from args
    args.slice(0, -1);
    const outputBindings = `@group(0) @binding(${inputs.length})\n
      var<storage, read_write> output: array<Field>;\n`;
    
    const shaderEntry = `
      ${inputBindings}
      ${outputBindings}

      @compute @workgroup_size(64)
      fn main(
        @builtin(global_invocation_id)
        global_id : vec3<u32>
      ) {
        var result = ${wgslFunction}(${args});
        output[global_id.x] = result;
      }
    `;

  const curveParamsWGSL = getCurveParamsWGSL(curve);

  const shaderModules = [U256WGSL, curveParamsWGSL, FieldModulusWGSL, shaderEntry];

  return await batchedEntry(inputs, shaderModules, FIELD_SIZE, batchSize);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_entry = field_entry;