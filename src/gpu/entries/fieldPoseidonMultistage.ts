import { FieldModulusWGSL } from "../FieldModulus";
import { FieldPoseidonWGSL } from "../FieldPoseidon";
import { PoseidonConstantsWGSL } from "../PoseidonConstants";
import { FieldAddWGSL } from "../FieldAdd";
import { entry } from "./entryCreator";

export const fieldPoseidonMultistage = async (input1: Array<number>, input2: Array<number>, input3: Array<number>) => {
  const baseShaderModules = [PoseidonConstantsWGSL, FieldModulusWGSL, FieldAddWGSL, FieldPoseidonWGSL];
  const firstHashOutputEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: u256s;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>, 39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<u256, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = aleo_poseidon(input1.u256s[global_id.x]);
      output[global_id.x] = result;
    }
  `;

  const firstHashOutput = await entry([input1, input2, input3], [...baseShaderModules, firstHashOutputEntry], 8, 8, 9);

  const fullRoundsEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<u256, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>, 39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<u256, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_full(input1[global_id.x], ${roundOffset});
      output[global_id.x] = result;
    }
  `;

  const halfRoundsEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<u256, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<u256, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_half(input1[global_id.x], ${roundOffset});
      output[global_id.x] = result;
    }
  `;

  let roundOffset = 0;
  let fullRoundsResult = firstHashOutput;
  for (let i = 0; i < 4; i++) {
    fullRoundsResult = await entry([Array.from(fullRoundsResult), input2, input3], [...baseShaderModules, fullRoundsEntry(roundOffset)]);
    roundOffset += 1;
  }

  let partialRoundsResult = fullRoundsResult;
  for (let i = 0; i < 31; i++) { 
    partialRoundsResult = await entry([Array.from(partialRoundsResult), input2, input3], [...baseShaderModules, halfRoundsEntry(roundOffset)]);
    roundOffset += 1;
  }

  let lastFullRoundsResult = partialRoundsResult;
  for (let i = 0; i < 4; i++) { 
    lastFullRoundsResult = await entry([Array.from(lastFullRoundsResult), input2, input3], [...baseShaderModules, fullRoundsEntry(roundOffset)]);
    roundOffset += 1;
  }

  const finalHashEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<u256, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<u256>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = input1[global_id.x][1];
      output[global_id.x] = result;
    }
  `;

  return await entry([Array.from(lastFullRoundsResult), input2, input3], [...baseShaderModules, finalHashEntry], 8, 8, (1/9)); 
}
