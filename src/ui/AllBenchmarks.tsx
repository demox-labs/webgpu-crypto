import React from 'react';
import { field_double } from '../gpu/entries/fieldDoubleEntry';
import { bulkAddFields, bulkDoubleFields, bulkInvertFields, bulkMulFields, bulkSubFields, bulkPowFields, bulkPowFields17, bulkSqrtFields, bulkGroupScalarMul, bulkPoseidon, bulkIsOwner, msm } from '../utils/wasmFunctions';
import { Benchmark } from './Benchmark';
import { PippingerBenchmark } from './PippingerBenchmark';
import { bigIntToU32Array, bigIntsToU16Array, bigIntsToU32Array, generateRandomFields, stripFieldSuffix, stripGroupSuffix } from '../gpu/utils';
import { field_add } from '../gpu/entries/fieldAddEntry';
import { field_sub } from '../gpu/entries/fieldSubEntry';
import { field_inverse } from '../gpu/entries/fieldInverseEntry';
import { field_pow } from '../gpu/entries/fieldModulusExponentiationEntry';
import { field_multiply } from '../gpu/entries/fieldModulusFieldMultiplyEntry';
import { bulkKochanski } from '../algorithms/Kochanski';
import { ALEO_FIELD_MODULUS } from '../params/AleoConstants';
import { field_sqrt } from '../gpu/entries/fieldSqrtEntry';
import { point_mul } from '../gpu/entries/curveMulPointEntry';
import { point_mul_multi } from '../gpu/entries/curveMulPointMultiPassEntry';
import { FieldMath } from '../utils/FieldMath';
import { field_pow_by_17 } from '../gpu/entries/fieldPow17Entry';
import { field_poseidon } from '../gpu/entries/fieldPoseidonEntry';
import { aleoMdStrings, aleoRoundConstantStrings } from '../params/PoseidonParams';
import { field_poseidon_multi } from '../gpu/entries/fieldPoseidonMultiPassEntry';
import { is_owner } from '../gpu/entries/isOwnerEntry';
import { is_owner_multi } from '../gpu/entries/isOwnerMultipassEntry';
import { convertBytesToFieldElement, convertCiphertextToDataView, getNonce, getPrivateOwnerBytes } from '../parsers/RecordParser';
import { field_poseidon_multi_2 } from '../gpu/entries/poseidonMultiPass';
import { naive_msm } from '../gpu/entries/naiveMSMEntry';
import { pippinger_msm } from '../gpu/entries/pippingerMSMEntry';
import { ExtPointType } from '@noble/curves/abstract/edwards';

const singleInputGenerator = (inputSize: number): bigint[][] => {
  return [generateRandomFields(inputSize)];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const squaresGenerator = (inputSize: number): bigint[][] => {
  const randomFields = generateRandomFields(inputSize);
  const squaredFields = randomFields.map((field) => (field * field) % ALEO_FIELD_MODULUS);
  return [squaredFields];
};

// const pointScalarGenerator = (inputSize: number): bigint[][] => {
//   // const groupArr = new Array(inputSize);
//   // // known group
//   // groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
//   const groupArr = generateRandomFields(inputSize);
//   const scalarArr = generateRandomFields(inputSize);
//   return [groupArr, scalarArr];
// };
const pointScalarGenerator = (inputSize: number): bigint[][] => {
  const groupArr = new Array(inputSize);
  //scalarArr.fill(BigInt('303411688971426691737907573487068071512981595762917890905859781721748416598'));
  // known group
  groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  const scalarArr = generateRandomFields(inputSize);
  return [groupArr, scalarArr];
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

const gpuCipherTextInputConverter = (inputs: string[][]): number[][] => {
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
    Array.from(bigIntsToU32Array(point_inputs)),
    Array.from(bigIntsToU32Array(owner_fields)),
    Array.from(bigIntsToU32Array(aleoMds)),
    Array.from(bigIntsToU32Array(aleoRoundConstants)),
    Array.from(bigIntToU32Array(ownerViewKeyScalar)),
    Array.from(bigIntToU32Array(ownerAddress_x))
  ];
};

const gpuSquaresResultConverter = (results: bigint[]): string[] => {
  return results.map((result) => (result * result % ALEO_FIELD_MODULUS).toString());
}

const wasmSquaresResultConverter = (results: string[]): string[] => {
  const bigIntResults = wasmFieldResultConverter(results).map((result) => BigInt(result));
  return bigIntResults.map((result) => (result * result % ALEO_FIELD_MODULUS).toString());
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

const seventeenGenerator = (inputSize: number): bigint[][] => { 
  const arr = new Array(inputSize);
  const firstInput = generateRandomFields(inputSize);
  arr.fill(BigInt(17));
  return [firstInput, arr];
}

const gpuBigIntInputConverter = (inputs: bigint[][]): number[][] => {
  return inputs.map((input) => Array.from(bigIntsToU32Array(input)));
};

const gpuPointScalarInputConverter = (inputs: bigint[][]): number[][] => {
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

  return [Array.from(bigIntsToU32Array(point_inputs)), Array.from(bigIntsToU32Array(inputs[1]))];
};

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

export const AllBenchmarks: React.FC = () => {
  return (
    <div>
      <Benchmark
        name={'Is Ownership Single Pass'}
        inputsGenerator={cipherTextsGenerator}
        gpuFunc={(inputs: number[][]) => is_owner(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
        gpuInputConverter={gpuCipherTextInputConverter}
        gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(0) ? 'true' : 'false')}}
        // gpuResultConverter={(results: bigint[]) => { return results.map((result) => result.toString())}}
        wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
        wasmInputConverter={(inputs: string[][]) => {return inputs}}
        wasmResultConverter={(results: string[]) => {return results}}
      />
      <Benchmark
        name={'Is Ownership Multi Pass'}
        inputsGenerator={cipherTextsGenerator}
        gpuFunc={(inputs: number[][]) => is_owner_multi(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
        gpuInputConverter={gpuCipherTextInputConverter}
        gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(1) ? 'true' : 'false')}}
        wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
        wasmInputConverter={(inputs: string[][]) => {return inputs}}
        wasmResultConverter={(results: string[]) => {return results}}
      />
      <Benchmark
        name={'Add Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_add(inputs[0], inputs[1])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkAddFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Subtract Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_sub(inputs[0], inputs[1])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkSubFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Multiply Fields'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_multiply(inputs[0], inputs[1])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkMulFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Multiply Fields Kochanski ts impl'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: number[][]) => bulkKochanski(inputs[0], inputs[1])}
        gpuInputConverter={(result: bigint[][]) => result}
        wasmFunc={(inputs: string[][]) => bulkMulFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Double Fields'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_double(inputs[0])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkDoubleFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Invert Fields'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_inverse(inputs[0])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkInvertFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Pow Fields with 17'}
        inputsGenerator={seventeenGenerator}
        gpuFunc={(inputs: number[][]) => field_pow(inputs[0], inputs[1])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Pow Fields with 17 dedicated func'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_pow_by_17(inputs[0])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields17(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Pow Fields with random'}
        inputsGenerator={doubleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_pow(inputs[0], inputs[1])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Square Root Fields'}
        inputsGenerator={squaresGenerator}
        gpuFunc={(inputs: number[][]) => field_sqrt(inputs[0])}
        gpuInputConverter={gpuBigIntInputConverter}
        gpuResultConverter={gpuSquaresResultConverter}
        wasmFunc={(inputs: string[][]) => bulkSqrtFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmSquaresResultConverter}
      />
      <Benchmark
        name={'Point Scalar Mul'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: number[][]) => point_mul(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
      />
      <Benchmark
        name={'Point Scalar Mul multi pass'}
        inputsGenerator={pointScalarGenerator}
        gpuFunc={(inputs: number[][]) => point_mul_multi(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
      />
      {/* <Benchmark
        name={'Is Owner'}
        inputsGenerator={recordGenerator}
        gpuFunc={(inputs: number[][]) => gpuIsOwner(inputs[0], inputs[1])}
        wasmFunc={(inputs: string[][]) => wasmIsOwner(inputs[0], inputs[1])}
      /> */}
      <Benchmark
        name={'Field Poseidon Hash single pass'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: number[][]) => field_poseidon(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Field Poseidon Hash multi pass'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: number[][]) => field_poseidon_multi(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Field Poseidon Hash multi pass 2'}
        inputsGenerator={poseidonGenerator}
        gpuFunc={(inputs: number[][]) => field_poseidon_multi_2(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
      <Benchmark
        name={'Naive MSM'}
        inputsGenerator={pointScalarGenerator}
        // change to custom summation function using FieldMath.addPoints
        gpuFunc={(inputs: number[][]) => naive_msm(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
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