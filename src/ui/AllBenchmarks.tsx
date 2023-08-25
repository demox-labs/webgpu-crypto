import React from 'react';
import { bulkAddFields, bulkDoubleFields, bulkInvertFields, bulkMulFields, bulkSubFields, bulkPowFields, bulkPowFields17, bulkSqrtFields, bulkGroupScalarMul, bulkPoseidon, bulkIsOwner, msm, bulkAddGroups } from '../utils/aleoWasmFunctions';
import { Benchmark } from './Benchmark';
import { bigIntToU32Array, bigIntsToU16Array, bigIntsToU32Array, generateRandomFields, gpuU32Inputs, stripFieldSuffix, stripGroupSuffix } from '../gpu/utils';
import { FIELD_MODULUS } from '../params/BLS12_377Constants';
import { point_mul } from '../gpu/entries/curve/curveMulPointEntry';
import { point_mul_multi } from '../gpu/entries/curve/curveMulPointMultiPassEntry';
import { FieldMath } from '../utils/BLS12_377FieldMath';
import { aleo_poseidon } from '../gpu/entries/bls12-377Algorithms/aleoPoseidonEntry';
import { aleoMdStrings, aleoRoundConstantStrings } from '../params/AleoPoseidonParams';
import { is_owner } from '../gpu/entries/bls12-377Algorithms/aleoIsOwnerEntry';
import { is_owner_multi } from '../gpu/entries/bls12-377Algorithms/aleoIsOwnerMultipassEntry';
import { is_owner_multi_reuse_buffers } from '../gpu/entries/isOwnerMultipassReuseBuffers';
import { convertBytesToFieldElement, convertCiphertextToDataView, getNonce, getPrivateOwnerBytes } from '../parsers/aleo/RecordParser';
import { aleo_poseidon_multi } from '../gpu/entries/bls12-377Algorithms/aleoPoseidonMultiPass';
import { naive_msm } from '../gpu/entries/naiveMSMEntry';
import { point_add } from '../gpu/entries/curve/curveAddPointsEntry';
import { point_mul_windowed } from '../gpu/entries/curve/curveMulPointWindowedEntry';
import { point_mul_multi_reuse } from '../gpu/entries/pointScalarMultipassReuseBuffer';
import { pippinger_msm } from '../gpu/entries/pippingerMSMEntry';
import { ExtPointType } from '@noble/curves/abstract/edwards';
import { field_entry } from '../gpu/entries/field/fieldEntry';
import { CurveType } from '../gpu/params';
import { AFFINE_POINT_SIZE, FIELD_SIZE } from '../gpu/U32Sizes';
import { PippingerBenchmark } from './PippingerBenchmark';

const singleInputGenerator = (inputSize: number): bigint[][] => {
  return [generateRandomFields(inputSize)];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const squaresGenerator = (inputSize: number): bigint[][] => {
  const randomFields = generateRandomFields(inputSize);
  const squaredFields = randomFields.map((field) => (field * field) % FIELD_MODULUS);
  return [squaredFields];
};

// Note: For now this will generate random scalars, but generate the same point
// for the inputs. This point is a known point on the curve.
const pointScalarGenerator = (inputSize: number): bigint[][] => {
  const groupArr = new Array(inputSize);
  groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  const scalarArr = generateRandomFields(inputSize);
  return [groupArr, scalarArr];
};

const doublePointGenerator = (inputSize: number): bigint[][] => {
  const groupArr1 = new Array(inputSize);
  groupArr1.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  const groupArr2 = new Array(inputSize);
  groupArr2.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  return [groupArr1, groupArr2];
};

const ownerViewKey = "AViewKey1dS9uE4XrARX3m5QUDWSrqmUwxY3PFKVdMvPwzbtbYrUh";
const ownerViewKeyScalar = BigInt('1047782004112991658538528321810337177976429471185056028001320450422875039246');
const ownerAddress_x = BigInt('7090760734045932545891632488445252924506076885393655832444210322936011804429');
const ciphertext = "record1qyqspf8z9eekgc5n8y0crj888m0ntz84psy3mrvhfp9sy2ea462em9qpqgqkzscqqgpqq5q752ylzzgduf0umw4hqafac3d6ev66feeydq4yqu9cj0e5ynqwhskrr53e4y2a3tazl7vfp94rczxzreqmxs6e4lsuvl2hu470myxqzcjrqqpqyqxyxjxxlp0a6m25sma5vgjn49ztqf3wvu0cx09q3ptjf59k4aarz9sl3flmy4lxsejs46h3nhrtap4m4tn3sck3lydeldlhfyg50vqslc83g4w0qmgepzdv5du8dyu0x2vq23j6w6f427qwhwfeewk8qagy4pgcyl";

const cipherTextsGenerator = (inputSize: number): string[][] => {
  const cipherTextArr = new Array(inputSize);
  cipherTextArr.fill(ciphertext);
  return [cipherTextArr];
};

const gpuCipherTextInputConverter = (inputs: string[][]): gpuU32Inputs[] => {
  const cipherTexts = inputs[0];
  const dataViews = cipherTexts.map((ct) => convertCiphertextToDataView(ct));
  const owner_fields = dataViews.map((dv) => BigInt(convertBytesToFieldElement(getPrivateOwnerBytes(dv))));
  const x_coords = dataViews.map(dv => getNonce(dv));
  const fieldMath = new FieldMath();
  const y_coords_map = new Map<bigint, bigint>();
  const y_coords = x_coords.map((x) => {
    const known_y = y_coords_map.get(x);
    const y = known_y ?? fieldMath.getPointFromX(x).y;
    y_coords_map.set(x, y);
    return y;
  });
  const point_inputs = x_coords.map((x, i) => [x, y_coords[i]]).flat();

  const aleoMds = aleoMdStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  const aleoRoundConstants = aleoRoundConstantStrings.map((arr) => arr.map((str) => BigInt(str))).flat();

  return [
    { u32Inputs: bigIntsToU32Array(point_inputs), individualInputSize: AFFINE_POINT_SIZE },
    { u32Inputs: bigIntsToU32Array(owner_fields), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntsToU32Array(aleoMds), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntsToU32Array(aleoRoundConstants), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntToU32Array(ownerViewKeyScalar), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntToU32Array(ownerAddress_x), individualInputSize: FIELD_SIZE }
  ];
};

const gpuSquaresResultConverter = (results: bigint[]): string[] => {
  return results.map((result) => (result * result % FIELD_MODULUS).toString());
}

const wasmSquaresResultConverter = (results: string[]): string[] => {
  const bigIntResults = wasmFieldResultConverter(results).map((result) => BigInt(result));
  return bigIntResults.map((result) => (result * result % FIELD_MODULUS).toString());
}

const poseidonGenerator = (inputSize: number): bigint[][] => { 
  const firstInput = generateRandomFields(inputSize);
  const secondInput = aleoMdStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  const thirdInput = aleoRoundConstantStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  return [firstInput, secondInput, thirdInput];
};

const doubleInputGenerator = (inputSize: number): bigint[][] => {
  const firstInput = generateRandomFields(inputSize);
  const secondInput = generateRandomFields(inputSize);
  return [firstInput, secondInput];
};

const gpuFieldInputConverter = (inputs: bigint[][]): gpuU32Inputs[] => {
  return inputs.map(input => { return { u32Inputs: bigIntsToU32Array(input), individualInputSize: FIELD_SIZE } });
};

const gpuPointScalarInputConverter = (inputs: bigint[][]): gpuU32Inputs[] => {
  const x_coords = inputs[0];
  const fieldMath = new FieldMath();
  const y_coords_map = new Map<bigint, bigint>();
  const y_coords = x_coords.map((x) => {
    const known_y = y_coords_map.get(x);
    const y = known_y ?? fieldMath.getPointFromX(x).y;
    y_coords_map.set(x, y);
    return y;
  });
  const point_inputs = x_coords.map((x, i) => [x, y_coords[i]]).flat();

  return [
    { u32Inputs: bigIntsToU32Array(point_inputs), individualInputSize: AFFINE_POINT_SIZE },
    { u32Inputs: bigIntsToU32Array(inputs[1]), individualInputSize: FIELD_SIZE }
  ];
};

const gpuPointsInputConverter = (inputs: bigint[][]): gpuU32Inputs[] => {
  const fieldMath = new FieldMath();
  const y_coords_map = new Map<bigint, bigint>();

  for (let i = 0; i < inputs.length; i++) {
    const x = inputs[i][0];
    const known_y = y_coords_map.get(x);
    const y = known_y ?? fieldMath.getPointFromX(x).y;
    y_coords_map.set(x, y);
  }

  const pointInputs: bigint[][] = [];
  for (let i = 0; i < inputs.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pointInputs[i] = inputs[i].map(x_coord => [x_coord, y_coords_map.get(x_coord)!]).flat();
  }

  return pointInputs.map((input) => { return { u32Inputs: bigIntsToU32Array(input), individualInputSize: AFFINE_POINT_SIZE }});
}
// After instantiating the FieldMath object here, it needs to be passed anywhere we need to 
// use the field math library to do operations (like add or multiply) on these points. 
// Was seeing a "Point is not instance of Point" error otherwise.
const pippingerGpuInputConverter = (scalars: bigint[]): [ExtPointType[], number[], FieldMath] => {
  const fieldMath = new FieldMath();
  const pointsArr = new Array(scalars.length);
  const x = BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246');
  const y = BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166');
  const t = BigInt('3446088593515175914550487355059397868296219355049460558182099906777968652023');
  const z = BigInt('1');
  const extPoint = fieldMath.createPoint(x, y , t, z);
  return [pointsArr.fill(extPoint), Array.from(bigIntsToU16Array(scalars)), fieldMath];
};

const wasmFieldResultConverter = (results: string[]): string[] => {
  return results.map((result) => stripFieldSuffix(result));
};

const wasmBigIntToFieldConverter = (inputs: bigint[][]): string[][] => {
  return inputs.map((input) => input.map((field) => `${field}field`));
};

const wasmPointMulConverter = (inputs: bigint[][]): string[][] => {
  const groups = inputs[0].map((input) => `${input}group`);
  const scalars = inputs[1].map((input) => `${input}scalar`);
  return [groups, scalars];
};

const wasmPointConverter = (inputs: bigint[][]): string[][] => {
  return inputs.map((input) => input.map((group) => `${group}group`));
};

export const AllBenchmarks: React.FC = () => {
  return (
    <div>
      <Benchmark
        name={'Is Ownership Single Pass'}
        inputsGenerator={cipherTextsGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => is_owner(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
        gpuInputConverter={gpuCipherTextInputConverter}
        gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(0) ? 'true' : 'false')}}
        // gpuResultConverter={(results: bigint[]) => { return results.map((result) => result.toString())}}
        wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
        wasmInputConverter={(inputs: string[][]) => {return inputs}}
        wasmResultConverter={(results: string[]) => {return results}}
        batchable={true}
      />
      <Benchmark
        name={'Is Ownership Multi Pass'}
        inputsGenerator={cipherTextsGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => is_owner_multi(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
        gpuInputConverter={gpuCipherTextInputConverter}
        gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(1) ? 'true' : 'false')}}
        wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
        wasmInputConverter={(inputs: string[][]) => {return inputs}}
        wasmResultConverter={(results: string[]) => {return results}}
        batchable={false}
      />
      <Benchmark
        name={'Is Ownership Multi Pass Reuse Buffers'}
        inputsGenerator={cipherTextsGenerator}
        gpuFunc={(inputs: number[][]) => is_owner_multi_reuse_buffers(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
        gpuInputConverter={gpuCipherTextInputConverter}
        gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(1) ? 'true' : 'false')}}
        wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
        wasmInputConverter={(inputs: string[][]) => {return inputs}}
        wasmResultConverter={(results: string[]) => {return results}}
        batchable={false}
      />
      <Benchmark
        name={'Add Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_add', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkAddFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Subtract Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sub', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkSubFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Multiply Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_multiply', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkMulFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Double Fields'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_double', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkDoubleFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Invert Fields'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_inverse', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkInvertFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Field Pow 17'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow_by_17', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields17(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Field Pow Random'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Square Root Fields'}
        inputsGenerator={squaresGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sqrt', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        gpuResultConverter={gpuSquaresResultConverter}
        wasmFunc={(inputs: string[][]) => bulkSqrtFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmSquaresResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Point Add'}
        inputsGenerator={doublePointGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_add(inputs[0], inputs[1], batchSize)}
        gpuInputConverter={gpuPointsInputConverter}
        wasmFunc={(inputs: string[][]) => bulkAddGroups(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={true}
      />
      <Benchmark
        name={'Point Scalar Mul'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_mul(inputs[0], inputs[1], batchSize)}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={true}
      />
      <Benchmark
        name={'Point Scalar Mul Windowed'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_windowed(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={true}
      />
      <Benchmark
        name={'Point Scalar Mul multi pass'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_multi(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={false}
      />
      <Benchmark
        name={'Point Scalar Mul multi pass buffer reuse'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: number[][]) => point_mul_multi_reuse(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={false}
      />
      <Benchmark
        name={'Aleo Poseidon Hash single pass'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => aleo_poseidon(inputs[0], inputs[1], inputs[2], batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Aleo Poseidon Hash multi pass'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => aleo_poseidon_multi(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={false}
      />
      <Benchmark
        name={'Aleo Poseidon Hash multi pass reuse'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: gpuU32Inputs[]) => aleo_poseidon_multi(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={false}
      />
      <Benchmark
        name={'Naive MSM'}
        inputsGenerator={pointScalarGenerator}
        // change to custom summation function using FieldMath.addPoints
        gpuFunc={(inputs: gpuU32Inputs[]) => naive_msm(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={false}
      />
      <PippingerBenchmark
        name={'Pippinger MSM V1'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => pippinger_msm(points, scalars, fieldMath)}
        gpuInputConverter={pippingerGpuInputConverter}
        wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
      />
    </div>
  )
};