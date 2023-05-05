import React, { useEffect, useState } from 'react';
import { bigIntsToU32Array, convertBigIntsToWasmFields, generateRandomFields, stripFieldSuffix, u32ArrayToBigInts } from '../gpu/utils';

interface DoubleInputBufferBenchmarkProps {
  name: string;
  gpuFunc: (a: number[], b: number[]) => Promise<Uint32Array | undefined>;
  wasmFunc: (a: string, b: string) => Promise<string>;
}

export const DoubleInputBufferBenchmark: React.FC<DoubleInputBufferBenchmarkProps> = ({name, gpuFunc, wasmFunc}) => {
  const initialDefaultInputSize = 1000;
  const [inputSize, setInputSize] = useState(initialDefaultInputSize);
  const [gpuTime, setGpuTime] = useState(0);
  const [wasmTime, setWasmTime] = useState(0);
  const [gpuRunning, setGpuRunning] = useState(false);
  const [wasmRunning, setWasmRunning] = useState(false);
  const initialResults: string[] = [];
  const [gpuResults, setGpuResults] = useState(initialResults);
  const [wasmResults, setWasmResults] = useState(initialResults);
  const [inputs1, setInputs1] = useState<bigint[]>([]);
  const [inputs2, setInputs2] = useState<bigint[]>([]);
  const [comparison, setComparison] = useState('Run both GPU and WASM to compare results');

  useEffect(() => {
    const firstInputs1 = generateRandomFields(initialDefaultInputSize);
    const firstInputs2 = generateRandomFields(initialDefaultInputSize);
    setInputs1(firstInputs1);
    setInputs2(firstInputs2);
  }, []);

  useEffect(() => {
    const newInputs1 = generateRandomFields(inputSize);
    setInputs1(newInputs1);
    const newInputs2 = generateRandomFields(inputSize);
    setInputs2(newInputs2);
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
      let gpuResultsDiffIndex = -1;
      for (let i = 0; i < gpuResults.length; i++) {
        if (gpuResults[i] !== wasmResults[i]) {
          gpuResultsDiffIndex = i;
          break;
        }
      }
      if (gpuResultsDiffIndex !== -1) {
        setComparison(`GPU and WASM results differ at index ${gpuResultsDiffIndex}`);
      } else {
        setComparison('GPU and WASM results are the same');
      }
    }
  }, [gpuResults, wasmResults]);

  const runWasm = async () => {
    setWasmRunning(true);
    const wasmInputs1 = convertBigIntsToWasmFields(inputs1);
    const wasmInputs2 = convertBigIntsToWasmFields(inputs2);
    const results: string[] = [];
    const wasmStart = performance.now();
    for (let i = 0; i < inputs1.length; i++) {
      results.push(await wasmFunc(wasmInputs1[i], wasmInputs2[i]));
    }
    const wasmEnd = performance.now();
    setWasmTime(wasmEnd - wasmStart);
    const resultStrings = results.map(r => stripFieldSuffix(r));
    console.log(resultStrings);
    setWasmResults(resultStrings);
    setWasmRunning(false);
  };

  const runGpu = async () => {
    setGpuRunning(true);
    const gpuInputs1 = Array.from(bigIntsToU32Array(inputs1));
    const gpuInputs2 = Array.from(bigIntsToU32Array(inputs2));
    const gpuStart = performance.now();
    const result = await gpuFunc(gpuInputs1, gpuInputs2);
    const gpuEnd = performance.now();
    setGpuTime(gpuEnd - gpuStart);
    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    const results = bigIntResult.map(r => r.toString());
    console.log(results);
    setGpuResults(results);
    setGpuRunning(false);
  };

  const spin = () => <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>;

  return (
    <div className="flex items-center space-x-4 px-5">
      <div className="text-gray-800 font-bold w-40 px-2">{name}</div> 
      <div className="text-gray-800">Input Size:</div>
      <input
        type="text"
        className="w-24 border border-gray-300 rounded-md px-2 py-1"
        value={inputSize}
        onChange={(e) => setInputSize(parseInt(e.target.value))}
      />
      <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md"  onClick={async () => { await runGpu()}}>
        {gpuRunning ? spin() : 'GPU'}
      </button>
      <div className="text-gray-800 w-36 truncate">{gpuTime > 0 ? gpuTime : 'GPU Time: 0ms'}</div>
      <button className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded-md" onClick={async () => { await runWasm()}}>
        {wasmRunning ? spin() : 'WASM'}
      </button>
      <div className="text-gray-800 w-36 truncate">{wasmTime > 0 ? wasmTime : 'WASM Time: 0ms'}</div>
      <div className="text-gray-800 w-48">{comparison}</div>
    </div>
  );
};