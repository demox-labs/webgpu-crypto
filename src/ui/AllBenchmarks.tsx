import React from 'react';
import { bulkAddFields,
  bulkDoubleFields,
  bulkInvertFields,
  bulkMulFields,
  bulkSubFields,
  bulkPowFields, 
  bulkPowFields17,
  bulkSqrtFields,
  bulkGroupScalarMul,
  bulkPoseidon,
  bulkIsOwner,
  msm,
  bulkAddGroups } from '../utils/aleoWasmFunctions';
import { Benchmark } from './Benchmark';
import { gpuU32Inputs, stripGroupSuffix } from '../gpu/utils';
import { point_mul } from '../gpu/entries/curve/curveMulPointEntry';
import { point_mul_multi } from '../gpu/entries/curve/curveMulPointMultiPassEntry';
import { FieldMath } from '../utils/BLS12_377FieldMath';
import { aleo_poseidon } from '../gpu/entries/bls12-377Algorithms/aleoPoseidonEntry';
import { is_owner } from '../gpu/entries/bls12-377Algorithms/aleoIsOwnerEntry';
import { is_owner_multi } from '../gpu/entries/bls12-377Algorithms/aleoIsOwnerMultipassEntry';
import { is_owner_multi_reuse_buffers } from '../gpu/entries/isOwnerMultipassReuseBuffers';
import { aleo_poseidon_multi } from '../gpu/entries/bls12-377Algorithms/aleoPoseidonMultiPass';
import { naive_msm } from '../gpu/entries/naiveMSMEntry';
import { point_add } from '../gpu/entries/curve/curveAddPointsEntry';
import { point_mul_windowed } from '../gpu/entries/curve/curveMulPointWindowedEntry';
import { point_mul_multi_reuse } from '../gpu/entries/pointScalarMultipassReuseBuffer';
import { pippinger_msm } from '../gpu/entries/pippingerMSMEntry';
import { ExtPointType } from '@noble/curves/abstract/edwards';
import { field_entry } from '../gpu/entries/field/fieldEntry';
import { CurveType } from '../gpu/params';
import { PippingerBenchmark } from './PippingerBenchmark';
import { bulkAddFields as bn254BulkAddFields,
  bulkSubFields as bn254BulkSubFields,
  bulkMulFields as bn254BulkMulFields,
  bulkInvertFields as bn254BulkInvertFields,
  bulkPowFields as bn254BulkPowFields,
  bulkPowFields17 as bn254BulkPowFields17,
  bulkSqrtFields as bn254BulkSqrtFields } from '../barretenberg-wasm-loader/wasm-functions';
import {
  cipherTextsGenerator,
  gpuCipherTextInputConverter,
  doubleInputGenerator,
  gpuFieldInputConverter,
  wasmBigIntToFieldConverter,
  wasmFieldResultConverter,
  singleInputGenerator,
  squaresGenerator,
  gpuSquaresResultConverter,
  bn254WasmSquaresResultConverter,
  bls12_377WasmSquaresResultConverter,
  doublePointGenerator,
  gpuPointsInputConverter,
  wasmPointConverter,
  pointScalarGenerator,
  gpuPointScalarInputConverter,
  wasmPointMulConverter,
  poseidonGenerator,
  pippingerGpuInputConverter,
  ownerViewKey
} from '../utils/inputsGenerator';

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
        name={'BLS12-377 Add Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_add', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkAddFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Add Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_add', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkAddFields(inputs[0], inputs[1])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Subtract Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sub', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkSubFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Subtract Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sub', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkSubFields(inputs[0], inputs[1])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Multiply Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_multiply', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkMulFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Multiply Fields'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_multiply', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkMulFields(inputs[0], inputs[1])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Double Fields'}
        inputsGenerator={(inputSize: number) => singleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_double', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkDoubleFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Invert Fields'}
        inputsGenerator={(inputSize: number) => singleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_inverse', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkInvertFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Invert Fields'}
        inputsGenerator={(inputSize: number) => singleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_inverse', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkInvertFields(inputs[0])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Field Pow 17'}
        inputsGenerator={(inputSize: number) => singleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow_by_17', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields17(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Field Pow 17'}
        inputsGenerator={(inputSize: number) => singleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow_by_17', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkPowFields17(inputs[0])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Field Pow Random'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPowFields(inputs[0], inputs[1])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Field Pow Random'}
        inputsGenerator={(inputSize: number) => doubleInputGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_pow', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bn254BulkPowFields(inputs[0], inputs[1])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={(results: string[]) => results}
        batchable={true}
      />
      <Benchmark
        name={'BLS12-377 Square Root Fields'}
        inputsGenerator={(inputSize: number) => squaresGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sqrt', CurveType.BLS12_377, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        gpuResultConverter={(results: bigint[]) => gpuSquaresResultConverter(results, CurveType.BLS12_377)}
        wasmFunc={(inputs: string[][]) => bulkSqrtFields(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={bls12_377WasmSquaresResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'BN254 Square Root Fields'}
        inputsGenerator={(inputSize: number) => squaresGenerator(inputSize, CurveType.BN254)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => field_entry('field_sqrt', CurveType.BN254, inputs, batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        gpuResultConverter={(results: bigint[]) => gpuSquaresResultConverter(results, CurveType.BN254)}
        wasmFunc={(inputs: string[][]) => bn254BulkSqrtFields(inputs[0])}
        wasmInputConverter={(inputs: string[][]) => inputs.map((input) => input.map((field) => field.toString()))}
        wasmResultConverter={bn254WasmSquaresResultConverter}
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
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_mul(inputs[0], inputs[1], batchSize)}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={true}
      />
      <Benchmark
        name={'Point Scalar Mul Windowed'}
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_windowed(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={true}
      />
      <Benchmark
        name={'Point Scalar Mul multi pass'}
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_multi(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={false}
      />
      <Benchmark
        name={'Point Scalar Mul multi pass buffer reuse'}
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: number[][]) => point_mul_multi_reuse(inputs[0], inputs[1])}
        gpuInputConverter={gpuPointScalarInputConverter}
        wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        batchable={false}
      />
      <Benchmark
        name={'Aleo Poseidon Hash single pass'}
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => aleo_poseidon(inputs[0], inputs[1], inputs[2], batchSize)}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={true}
      />
      <Benchmark
        name={'Aleo Poseidon Hash multi pass'}
        inputsGenerator={(inputSize: number) => poseidonGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[]) => aleo_poseidon_multi(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={false}
      />
      <Benchmark
        name={'Aleo Poseidon Hash multi pass reuse'}
        inputsGenerator={(inputSize: number) => poseidonGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(inputs: gpuU32Inputs[]) => aleo_poseidon_multi(inputs[0], inputs[1], inputs[2])}
        gpuInputConverter={gpuFieldInputConverter}
        wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
        wasmInputConverter={wasmBigIntToFieldConverter}
        wasmResultConverter={wasmFieldResultConverter}
        batchable={false}
      />
      <Benchmark
        name={'Naive MSM'}
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
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
        inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
        gpuFunc={(points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => pippinger_msm(points, scalars, fieldMath)}
        gpuInputConverter={pippingerGpuInputConverter}
        wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
        wasmInputConverter={wasmPointMulConverter}
        wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
      />
    </div>
  )
};