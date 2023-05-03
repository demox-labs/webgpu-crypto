/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback } from 'react';
import { bigIntsToU32Array, u32ArrayToBigInts } from './gpu/utils';
import { addFields } from './utils/helper';
import { field_add } from './gpu/samples/fieldEntry';

const GPUPerformanceButton: React.FC = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const onClickHandler = useCallback(async () => {
    if (isRunning) {
      return;
    }
    setIsRunning(true);
    const randomStrings = createRandomBigIntStrings(1_000_000);
    console.log(randomStrings);
    await benchmarkGPU(randomStrings);
    // await benchmarkWasm(randomStrings);
    setIsRunning(false);
  }, [isRunning]);

  const benchmarkGPU = async (bigIntStrings: string[]) => {
    const bigInts = bigIntStrings.map(b => BigInt(b));
    const bigIntsArray = bigIntsToU32Array(bigInts);
    const gpuStart = performance.now();
    const result = await field_add(bigIntsArray, bigIntsArray);
    const gpuEnd = performance.now();
    console.log('gpu time', gpuEnd - gpuStart);
    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    console.log('u32 to bigints conversion time', performance.now() - gpuEnd);
    console.log('total gpu with conversion', performance.now() - gpuStart);
    console.log(bigIntResult);
  }

  const benchmarkWasm = async (bigIntStrings: string[]) => {
    const fields = bigIntStrings.map(b => b + 'field');
    const results: string[] = [];
    const wasmStart = performance.now();
    for (let i = 0; i < fields.length; i++) {
      results.push(await addFields(fields[i], fields[i]));
    }
    const wasmEnd = performance.now();
    console.log('wasm time', wasmEnd - wasmStart);
    console.log(results);
  }

  const createRandomBigIntStrings = (size: number) => {
    const randomBigInts = [];
    for (let i = 0; i < size; i++) {
      let bigIntString = '';
      // just skip the first 8 bytes, don't want to make a number bigger than the aleo field constant
      for (let j = 1; j < 8; j++) {
        bigIntString += Math.floor(Math.random() * (2**32 - 1));
      }
      randomBigInts.push(bigIntString)
    }
    return randomBigInts;
  }

  return (
    <button onClick={async () => { await onClickHandler(); }}>
      Click me to run GPU
    </button>
  );
};

export default GPUPerformanceButton;