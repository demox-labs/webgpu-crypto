import React, { useEffect, useState } from 'react';
import { field_add } from '../gpu/entries/fieldAddEntry';
import { addFields } from '../utils/wasmFunctions';
import { bigIntsToU32Array, convertBigIntsToWasmFields, generateRandomFields, stripFieldSuffix, u32ArrayToBigInts } from '../gpu/utils';

export const BenchmarkFieldAdd: React.FC = () => {
  const initialDefaultInputSize = 1000;
  const [inputSize, setInputSize] = useState(initialDefaultInputSize);
  const [gpuTime, setGpuTime] = useState(0);
  const [wasmTime, setWasmTime] = useState(0);
  const initialResults: string[] = [];
  const [gpuResults, setGpuResults] = useState(initialResults);
  const [wasmResults, setWasmResults] = useState(initialResults);
  const [inputs, setInputs] = useState<bigint[]>([]);
  const [comparison, setComparison] = useState('Run both GPU and WASM to compare results');

  useEffect(() => {
    const firstInputs = generateRandomFields(initialDefaultInputSize);
    setInputs(firstInputs);
  }, []);

  useEffect(() => {
    const newInputs = generateRandomFields(inputSize);
    setInputs(newInputs);
  }, [inputSize]);

  useEffect(() => {
    if (gpuResults.length === 0 && wasmResults.length === 0) {
      setComparison('Run benchmarks to compare results.')
    } else if (gpuResults.length === 0) {
      setComparison('Run GPU benchmark to compare results.')
    } else if (wasmResults.length === 0) {
      setComparison('Run WASM benchmark to compare results.')
    } else if (gpuResults.length !== wasmResults.length) {
      setComparison('GPU and WASM results are different lengths');
    } else {
      for (let i = 0; i < gpuResults.length; i++) {
        if (gpuResults[i] !== wasmResults[i]) {
          setComparison(`GPU and WASM results differ at index ${i}`);
          break;
        }
      }

      setComparison('GPU and WASM results are the same');
    }
  }, [gpuResults, wasmResults]);

  const wasmAddFields = async (inputs: bigint[]) => {
    const wasmInputs = convertBigIntsToWasmFields(inputs);
    const results: string[] = [];
    const wasmStart = performance.now();
    for (let i = 0; i < inputs.length; i++) {
      results.push(await addFields(wasmInputs[i], wasmInputs[i]));
    }
    const wasmEnd = performance.now();
    setWasmTime(wasmEnd - wasmStart);
    const resultStrings = results.map(r => stripFieldSuffix(r));
    console.log(resultStrings);
    setWasmResults(resultStrings);
  };

  const gpuAddFields = async (inputs: bigint[]) => {
    const gpuInputs = Array.from(bigIntsToU32Array(inputs));
    const gpuStart = performance.now();
    const result = await field_add(gpuInputs, gpuInputs);
    const gpuEnd = performance.now();
    setGpuTime(gpuEnd - gpuStart);
    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    const results = bigIntResult.map(r => r.toString());
    console.log(results);
    setGpuResults(results);
  };

  return (
    <div className="py-2">
      <input type="number" value={inputSize} onChange={(e) => setInputSize(parseInt(e.target.value))} />
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full" onClick={async () => { await gpuAddFields(inputs)}}>GPU Field Add</button>
      <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full" onClick={async () => { await wasmAddFields(inputs)}}>WASM Field Add</button>
      <div>{gpuTime > 0 ? gpuTime : 'Not run'}</div>
      <div>{wasmTime > 0 ? wasmTime : 'Not run'}</div>
      <div>{comparison}</div>
    </div>
  );
};