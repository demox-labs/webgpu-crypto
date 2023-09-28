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
  bulkAddGroups,
  ntt as bls12_377NTT,
} from '../utils/aleoWasmFunctions';
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
import { pippenger_msm } from '../gpu/entries/pippengerMSMEntry';
import { ExtPointType } from '@noble/curves/abstract/edwards';
import { field_entry } from '../gpu/entries/field/fieldEntry';
import { CurveType, bn254BulkTSMulPoints } from '../gpu/curveSpecific';
import { PippengerBenchmark } from './PippengerBenchmark';
import { bulkAddFields as bn254BulkAddFields,
  bulkSubFields as bn254BulkSubFields,
  bulkMulFields as bn254BulkMulFields,
  bulkInvertFields as bn254BulkInvertFields,
  bulkPowFields as bn254BulkPowFields,
  bulkPowFields17 as bn254BulkPowFields17,
  bulkSqrtFields as bn254BulkSqrtFields, 
  ntt as bn254NTT,
  bulkAddPoints as bn254BulkAddPoints, 
  bulkDoublePoints as bn254BulkDoublePoints,
  bulkMulPoints as bn254BulkMulPoints,
  naive_msm as bn254NaiveMsm,
  pippenger_msm as bn254PippengerMsm,
  bbPoint
} from '../barretenberg-wasm-loader/wasm-functions';
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
  pippengerGpuInputConverter,
  ownerViewKey,
  bn254PointsGPUInputConverter,
  singlePointGenerator,
} from '../utils/inputsGenerator';
import { Accordion } from './Accordion';
import { NTTBenchmark } from './NTTBenchmark';
import { BLS12_377ParamsWGSL } from '../gpu/wgsl/BLS12-377Params';
import { BN254ParamsWGSL } from '../gpu/wgsl/BN254Params';
import { ROOTS_OF_UNITY as BLS12_377_ROOTS, FIELD_MODULUS as BLS12_377_MODULUS } from '../params/BLS12_377Constants';
import { FR_FIELD_MODULUS as BN254_FR, FQ_FIELD_MODULUS as BN254_FQ, ROOTS_OF_UNITY as BN254_ROOTS } from '../params/BN254Constants';
import { point_double } from '../gpu/entries/curve/curveDoublePointEntry';
import { aleo_poseidon_reuse } from '../gpu/entries/poseidonMultiPassBufferReuse';

export const AllBenchmarks: React.FC = () => {
  return (
    <div>
      <Accordion title={'Ownership Checks'}>
        <Benchmark
          name={'Is Ownership Single Pass'}
          inputsGenerator={cipherTextsGenerator}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => is_owner(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5], batchSize)}
          gpuInputConverter={gpuCipherTextInputConverter}
          gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(0) ? 'true' : 'false')}}
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
          gpuFunc={(inputs: gpuU32Inputs[]) => is_owner_multi_reuse_buffers(inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5])}
          gpuInputConverter={gpuCipherTextInputConverter}
          gpuResultConverter={(results: bigint[]) => { return results.map((result) => result === BigInt(1) ? 'true' : 'false')}}
          wasmFunc={(inputs: string[][]) => bulkIsOwner(inputs[0], ownerViewKey)}
          wasmInputConverter={(inputs: string[][]) => {return inputs}}
          wasmResultConverter={(results: string[]) => {return results}}
          batchable={false}
        />
      </Accordion>
      <Accordion title={'Field Operations'}>
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
      </Accordion>
      <Accordion title={'Curve Operations'}>
        <Benchmark
          name={'BN254 Point Double'}
          inputsGenerator={(inputSize: number) => singlePointGenerator(inputSize, CurveType.BN254)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_double(CurveType.BN254, inputs[0], batchSize)}
          gpuInputConverter={bn254PointsGPUInputConverter}
          wasmFunc={(inputs: bbPoint[][]) => bn254BulkDoublePoints(inputs[0])}
          wasmInputConverter={(inputs: bbPoint[][]) => inputs}
          wasmResultConverter={(results: string[]) => results}
          batchable={true}
        />
        <Benchmark
          name={'BLS12-377 Point Add'}
          inputsGenerator={(inputSize: number) => doublePointGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_add(CurveType.BLS12_377, inputs[0], inputs[1], batchSize)}
          gpuInputConverter={gpuPointsInputConverter}
          wasmFunc={(inputs: string[][]) => bulkAddGroups(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={true}
        />
        <Benchmark
          name={'BN254 Point Add'}
          inputsGenerator={(inputSize: number) => doublePointGenerator(inputSize, CurveType.BN254)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_add(CurveType.BN254, inputs[0], inputs[1], batchSize)}
          gpuInputConverter={bn254PointsGPUInputConverter}
          wasmFunc={(inputs: bbPoint[][]) => bn254BulkAddPoints(inputs[0], inputs[1])}
          wasmInputConverter={(inputs: bbPoint[][]) => inputs}
          batchable={true}
        />
        <Benchmark
          name={'BLS12-377 Point Scalar'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_mul(CurveType.BLS12_377, inputs[0], inputs[1], batchSize)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BLS12_377)}
          wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={true}
        />
        <Benchmark
          name={'BN-254 Point Scalar'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BN254)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_mul(CurveType.BN254, inputs[0], inputs[1], batchSize)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BN254)}
          wasmFunc={(inputs: any[][]) => bn254BulkMulPoints(inputs[0], inputs[1])}
          wasmInputConverter={(inputs: any[][]) => inputs}
          batchable={true}
        />
        <Benchmark
          name={'BLS12-377 Point Scalar Windowed'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => point_mul_windowed(CurveType.BLS12_377, inputs[0], inputs[1], batchSize)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BLS12_377)}
          wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={true}
        />
        <Benchmark
          name={'Point Scalar Mul multi pass'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_multi(inputs[0], inputs[1])}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BLS12_377)}
          wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={false}
        />
        <Benchmark
          name={'Point Scalar Mul multi pass buffer reuse'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[]) => point_mul_multi_reuse(inputs[0], inputs[1])}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BLS12_377)}
          wasmFunc={(inputs: string[][]) => bulkGroupScalarMul(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={false}
        />
      </Accordion>
      <Accordion title={'Poseidon Hash'}>
        <Benchmark
          name={'Aleo Poseidon Hash single pass'}
          inputsGenerator={(inputSize: number) => poseidonGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(inputs: gpuU32Inputs[], batchSize: number) => aleo_poseidon(inputs[0], batchSize)}
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
          gpuFunc={(inputs: gpuU32Inputs[]) => aleo_poseidon_reuse(inputs[0], inputs[1], inputs[2])}
          gpuInputConverter={gpuFieldInputConverter}
          wasmFunc={(inputs: string[][]) => bulkPoseidon(inputs[0])}
          wasmInputConverter={wasmBigIntToFieldConverter}
          wasmResultConverter={wasmFieldResultConverter}
          batchable={false}
        />
      </Accordion>
      <Accordion title='MSM'>
        <Benchmark
          name={'BLS12-377 Naive MSM'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          // change to custom summation function using FieldMath.addPoints
          gpuFunc={(inputs: gpuU32Inputs[]) => naive_msm(inputs[0], inputs[1], CurveType.BLS12_377)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BLS12_377)}
          wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
          batchable={false}
        />
        <Benchmark
          name={'BN-254 Naive MSM'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BN254)}
          // change to custom summation function using FieldMath.addPoints
          gpuFunc={(inputs: gpuU32Inputs[]) => naive_msm(inputs[0], inputs[1], CurveType.BN254)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BN254)}
          wasmFunc={(inputs: any[][]) => bn254NaiveMsm(inputs[0], inputs[1])}
          batchable={false}
        />
        <Benchmark
          name={'BN-254 bberg pippenger'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BN254)}
          // change to custom summation function using FieldMath.addPoints
          gpuFunc={(inputs: gpuU32Inputs[]) => naive_msm(inputs[0], inputs[1], CurveType.BN254)}
          gpuInputConverter={(inputs: any[][]) => gpuPointScalarInputConverter(inputs, CurveType.BN254)}
          wasmFunc={(inputs: any[][]) => bn254PippengerMsm(inputs[0], inputs[1])}
          batchable={false}
        />
        <PippengerBenchmark
          name={'BLS12-377 Pippenger MSM'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BLS12_377)}
          gpuFunc={(points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => pippenger_msm(CurveType.BLS12_377, points, scalars, fieldMath)}
          gpuInputConverter={(inputs: any) => pippengerGpuInputConverter(CurveType.BLS12_377, inputs)}
          wasmFunc={(inputs: string[][]) => msm(inputs[0], inputs[1])}
          wasmInputConverter={wasmPointMulConverter}
          wasmResultConverter={(results: string[]) => { return results.map((result) => stripGroupSuffix(result))}}
        />
        <PippengerBenchmark
          name={'BN254 Pippenger MSM'}
          inputsGenerator={(inputSize: number) => pointScalarGenerator(inputSize, CurveType.BN254)}
          gpuFunc={(points: ExtPointType[], scalars: number[], fieldMath: FieldMath) => pippenger_msm(CurveType.BN254, points, scalars)}
          gpuInputConverter={(inputs: any) => pippengerGpuInputConverter(CurveType.BN254, inputs)}
          wasmFunc={(inputs: any[][]) => bn254NaiveMsm(inputs[0], inputs[1])}
          wasmInputConverter={(inputs: any[][]) => inputs}
          wasmResultConverter={(results: string[]) => results}
        />
      </Accordion>
      <Accordion title='NTT'>
        <NTTBenchmark
          name={'NTT BLS12-377'}
          fieldParamsWGSL={BLS12_377ParamsWGSL}
          wasmNTT={bls12_377NTT}
          rootsOfUnity={BLS12_377_ROOTS}
          fieldModulus={BLS12_377_MODULUS}
        />
        {/* This should include the polynomial generator but it's very slow for bn-254 */}
        <NTTBenchmark
          name={'NTT BN254'}
          fieldParamsWGSL={BN254ParamsWGSL}
          wasmNTT={bn254NTT}
          rootsOfUnity={BN254_ROOTS}
          fieldModulus={BN254_FR}
        />
      </Accordion>  
    </div>
  )
};