import { BLS12_377ParamsWGSL } from "../../wgsl/BLS12-377Params";
import { FieldModulusWGSL } from "../../wgsl/FieldModulus";
import { AleoPoseidonWGSL } from "../../wgsl/AleoPoseidon";
import { AleoPoseidonConstantsWGSL } from "../../wgsl/AleoPoseidonConstants";
import { U256WGSL } from "../../wgsl/U256";
import { entry } from "../entryCreator";

export const aleo_poseidon = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: u256s;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = aleo_poseidon(input1.u256s[global_id.x]);
      output.u256s[global_id.x] = result;
    }
  `;

  const shaderModules = [AleoPoseidonConstantsWGSL, U256WGSL, BLS12_377ParamsWGSL, FieldModulusWGSL, AleoPoseidonWGSL, shaderEntry];

  return await entry([input1, input2, input3], shaderModules);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).aleo_poseidon = aleo_poseidon;