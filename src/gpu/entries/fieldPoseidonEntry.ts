import { FieldModulusWGSL } from "../FieldModulus";
import { FieldPoseidonWGSL } from "../FieldPoseidon";
import { PoseidonConstantsWGSL } from "../PoseidonConstants";
import { FieldAddWGSL } from "../FieldAdd";
import { entry } from "./entryCreator";

export const field_poseidon = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  const shaderEntry = `
    @group(0) @binding(0)
    var<storage, read> input1: u256s;
    @group(0) @binding(1)
    var<storage, read> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: u256s;

    @compute @workgroup_size(8, 8)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = aleo_poseidon(input1.u256s[(global_id.x * 8) + global_id.y]);
      //u256(array<u32, 8>(0, 0, 0, 0, 0, 0, global_id.x, global_id.y));
      //aleo_poseidon(input1.u256s[(global_id.x * 8) + global_id.y]);
      output.u256s[(global_id.x * 8) + global_id.y] = result;
    }
  `;

  const shaderModules = [PoseidonConstantsWGSL, FieldModulusWGSL, FieldAddWGSL, FieldPoseidonWGSL, shaderEntry];

  return await entry([input1, input2, input3], shaderModules);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).field_poseidon = field_poseidon;