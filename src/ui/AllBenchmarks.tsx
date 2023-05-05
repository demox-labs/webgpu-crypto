import React from 'react';
import { field_double } from '../gpu/entries/fieldDoubleEntry';
import { bulkAddFields, bulkDoubleFields, bulkSubFields } from '../utils/wasmFunctions';
import { Benchmark } from './Benchmark';
import { bigIntsToU32Array, generateRandomFields, stripFieldSuffix } from '../gpu/utils';
import { field_add } from '../gpu/entries/fieldAddEntry';
import { field_sub } from '../gpu/entries/fieldSubEntry';

const singleInputGenerator = (inputSize: number): bigint[][] => {
  return [generateRandomFields(inputSize)];
};

const doubleInputGenerator = (inputSize: number): bigint[][] => {
  const firstInput = generateRandomFields(inputSize);
  const secondInput = generateRandomFields(inputSize);
  return [firstInput, secondInput];
};

const gpuBigIntInputConverter = (inputs: bigint[][]): number[][] => {
  return inputs.map((input) => Array.from(bigIntsToU32Array(input)));
};

const wasmFieldResultConverter = (results: string[]): string[] => {
  return results.map((result) => stripFieldSuffix(result));
};

const wasmBigIntToFieldConverter = (inputs: bigint[][]): string[][] => {
  return inputs.map((input) => input.map((field) => `${field}field`));
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
        name={'Double Fields'}
        inputsGenerator={singleInputGenerator}
        gpuFunc={(inputs: number[][]) => field_double(inputs[0])}
        gpuInputConverter={gpuBigIntInputConverter}
        wasmFunc={(inputs: string[][]) => bulkDoubleFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
      />
    </div>
  )
};