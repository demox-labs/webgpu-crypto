import React from 'react';
import { field_double } from '../gpu/entries/fieldDoubleEntry';
import { bulkAddFields, bulkDoubleFields, bulkInvertFields, bulkMulFields, bulkSubFields, bulkPowFields, bulkSqrtFields, bulkGroupScalarMul } from '../utils/wasmFunctions';
import { Benchmark } from './Benchmark';
import { bigIntsToU32Array, generateRandomFields, stripFieldSuffix, stripGroupSuffix } from '../gpu/utils';
import { field_add } from '../gpu/entries/fieldAddEntry';
import { field_sub } from '../gpu/entries/fieldSubEntry';
import { field_inverse } from '../gpu/entries/fieldInverseEntry';
import { field_pow } from '../gpu/entries/fieldModulusExponentiationEntry';
import { field_multiply } from '../gpu/entries/fieldModulusFieldMultiplyEntry';
import { bulkKochanski } from '../algorithms/Kochanski';
import { ALEO_FIELD_MODULUS } from '../params/AleoConstants';
import { field_sqrt } from '../gpu/entries/fieldSqrtEntry';
import { point_mul } from '../gpu/entries/curveMulPointEntry';
import { FieldMath } from '../utils/FieldMath';

const singleInputGenerator = (inputSize: number): bigint[][] => {
  return [generateRandomFields(inputSize)];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const squaresGenerator = (inputSize: number): bigint[][] => {
  const randomFields = generateRandomFields(inputSize);
  const squaredFields = randomFields.map((field) => (field * field) % ALEO_FIELD_MODULUS);
  console.log(squaredFields);
  return [squaredFields];
};

const pointScalarGenerator = (inputSize: number): bigint[][] => {
  const groupArr = new Array(inputSize);
  const scalarArr = new Array(inputSize);
  scalarArr.fill(BigInt(500_000));
  // known group
  groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  // const scalarArr = generateRandomFields(inputSize);
  return [groupArr, scalarArr];
};

const gpuSquaresResultConverter = (results: bigint[]): string[] => {
  return results.map((result) => (result * result % ALEO_FIELD_MODULUS).toString());
}

const wasmSquaresResultConverter = (results: string[]): string[] => {
  const bigIntResults = wasmFieldResultConverter(results).map((result) => BigInt(result));
  return bigIntResults.map((result) => (result * result % ALEO_FIELD_MODULUS).toString());
}

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
      {/* <Benchmark
        name={'Is Owner'}
        inputsGenerator={recordGenerator}
        gpuFunc={(inputs: number[][]) => gpuIsOwner(inputs[0], inputs[1])}
        wasmFunc={(inputs: string[][]) => wasmIsOwner(inputs[0], inputs[1])}
      /> */}
    </div>
  )
};