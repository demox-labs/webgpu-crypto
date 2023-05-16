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
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = aleo_poseidon(input1.u256s[global_id.x]);
      output[global_id.x] = result;
    }
  `;

  const firstHashOutput = await entry([input1, input2, input3], [...baseShaderModules, firstHashOutputEntry]);

  const fourFullRoundsEntry = (roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(64, 4)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_full(input1[global_id.x], global_id.y + ${roundOffset});
      input1[global_id.x] = result;
      output[global_id.x] = result;
    }
  `;

  const fourFullRounds = await entry([Array.from(firstHashOutput), input2, input3], [...baseShaderModules, fourFullRoundsEntry(0)]);

  const thirtyOneHalfRoundsEntry = (numRounds: number, roundOffset: number) => `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<array<Field, 9>>;

    @compute @workgroup_size(64, ${numRounds})
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = poseidon_round_half(input1[global_id.x], global_id.y + ${roundOffset});
      input1[global_id.x] = result;
      output[global_id.x] = result;
    }
  `;

  let thirtyOneHalfRounds = await entry([Array.from(fourFullRounds), input2, input3], [...baseShaderModules, thirtyOneHalfRoundsEntry(4, 4)])
  let numHalfRounds = 27;
  let roundOffset = 8;
  while (numHalfRounds > 0) {
    const numRoundsThisChunk = numHalfRounds > 4 ? 4 : numHalfRounds;
    thirtyOneHalfRounds = await entry([Array.from(fourFullRounds), input2, input3], [...baseShaderModules, thirtyOneHalfRoundsEntry(numRoundsThisChunk, roundOffset)]);
    numHalfRounds -= numRoundsThisChunk;
    roundOffset += numRoundsThisChunk;
  }

  const fourMoreFullRounds = await entry([Array.from(thirtyOneHalfRounds), input2, input3], [...baseShaderModules, fourFullRoundsEntry(roundOffset)]);

  const finalHashEntry = `
    @group(0) @binding(0)
    var<storage, read_write> input1: array<array<Field, 9>>;
    @group(0) @binding(1)
    var<storage, read_write> aleoMds: array<array<u256, 9>, 9>;
    @group(0) @binding(2)
    var<storage, read_write> aleoRoundConstants: array<array<u256, 9>,39>;
    @group(0) @binding(3)
    var<storage, read_write> output: array<Field>;

    @compute @workgroup_size(64)
    fn main(
      @builtin(global_invocation_id) global_id : vec3<u32>
    ) {
      var result = input1[global_id.x][1];
      output[global_id.x] = result;
    }
  `;

  return await entry([Array.from(fourMoreFullRounds), input2, input3], [...baseShaderModules, finalHashEntry]);
}