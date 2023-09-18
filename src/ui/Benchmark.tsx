/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { gpuU32Inputs, u32ArrayToBigInts } from '../gpu/utils';
import CSVExportButton from './CSVExportButton';

interface BenchmarkProps {
  name: string;
  inputsGenerator: (inputSize: number) => any[][] | Promise<any[][]>;
  gpuFunc: (inputs: any[], batchSize?: any) => Promise<Uint32Array>;
  gpuInputConverter: (inputs: any[][]) => gpuU32Inputs[] | bigint[][];
  gpuResultConverter?: (results: bigint[]) => string[];
  wasmFunc: (inputs: any[][]) => Promise<string[]>;
  wasmInputConverter: (inputs: any[][]) => any[][];
  wasmResultConverter: (results: string[]) => string[];
  batchable: boolean;
}

export const Benchmark: React.FC<BenchmarkProps> = (
  {name, inputsGenerator, gpuFunc, gpuInputConverter, gpuResultConverter, wasmFunc, wasmInputConverter, wasmResultConverter, batchable=true}
  ) => {
  const initialDefaultInputSize = 1_000;
  const [inputSize, setInputSize] = useState(initialDefaultInputSize);
  const initialBatchSize = 1_000_000;
  const [batchSize, setBatchSize] = useState(initialBatchSize);
  const [gpuTime, setGpuTime] = useState(0);
  const [wasmTime, setWasmTime] = useState(0);
  const [gpuRunning, setGpuRunning] = useState(false);
  const [wasmRunning, setWasmRunning] = useState(false);
  const initialResults: string[] = [];
  const [gpuResults, setGpuResults] = useState(initialResults);
  const [wasmResults, setWasmResults] = useState(initialResults);
  const [inputs, setInputs] = useState<any[][]>([]);
  const [comparison, setComparison] = useState('Run both GPU and WASM to compare results');
  const [benchmarkResults, setBenchmarkResults] = useState<any[][]>([["InputSize", "GPUorWASM", "Time"]]);

  useEffect(() => {
    const fetchInputs = async () => {
      const generatedInputs = await inputsGenerator(inputSize);
      setInputs(generatedInputs);
    };
    fetchInputs();
  }, []);

  useEffect(() => {
    const setNewInputs = async () => {
      const newInputs = await inputsGenerator(inputSize);
      setInputs(newInputs);
    };
    setNewInputs();
  }, [inputSize]);

  useEffect(() => {
    if (gpuResults.length === 0 && wasmResults.length === 0) {
      setComparison('Run benchmarks to compare results.')
    } else if (gpuResults.length === 0) {
      setComparison('🎮 Run GPU')
    } else if (wasmResults.length === 0) {
      setComparison('👾 Run WASM')
    } else if (gpuResults.length !== wasmResults.length) {
      setComparison('⛔️ Different length results');
    } else {
      let gpuResultsDiffIndex = -1;
      for (let i = 0; i < gpuResults.length; i++) {
        if (gpuResults[i] !== wasmResults[i]) {
          gpuResultsDiffIndex = i;
          break;
        }
      }
      if (gpuResultsDiffIndex !== -1) {
        setComparison(`❌ different at index ${gpuResultsDiffIndex}`);
      } else {
        setComparison('✅');
      }
    }
  }, [gpuResults, wasmResults]);

  const runWasm = async () => {
    const wasmInputs = wasmInputConverter(inputs);
    setWasmRunning(true);
    const wasmStart = performance.now();
    const results: string[] = await wasmFunc(wasmInputs);
    const wasmEnd = performance.now();
    const wasmPerformance = wasmEnd - wasmStart;
    setWasmTime(wasmPerformance);
    const comparableWasmResults = wasmResultConverter(results);
    console.log(comparableWasmResults);
    setWasmResults(comparableWasmResults);
    const benchMarkResult = [inputSize, "WASM", wasmPerformance];
    setBenchmarkResults([...benchmarkResults, benchMarkResult]);
    setWasmRunning(false);
  };

  const runGpu = async () => {
    const gpuInputs = gpuInputConverter(inputs);
    setGpuRunning(true);
    const gpuStart = performance.now();
    const result = await gpuFunc(gpuInputs, batchSize);
    const gpuEnd = performance.now();
    const gpuPerformance = gpuEnd - gpuStart;
    setGpuTime(gpuPerformance);
    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    const results = gpuResultConverter ? gpuResultConverter(bigIntResult) : bigIntResult.map(r => r.toString());
    console.log(results);
    setGpuResults(results);
    const benchMarkResult = [inputSize, "GPU", gpuPerformance];
    setBenchmarkResults([...benchmarkResults, benchMarkResult]);
    setGpuRunning(false);
  };

  const spin = () => <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>;

  return (
    <div className="flex items-center space-x-4 px-5">
      <div className="font-bold w-40 px-2">{name}</div> 
      <div>Input Size:</div>
      <input
        type="text"
        className="w-24 border border-gray-300 rounded-md px-2 py-1"
        value={inputSize}
        onChange={(e) => setInputSize(parseInt(e.target.value))}
      />
      <div>Batch Size:</div>
      <input
        type="text"
        className="w-24 border border-gray-300 rounded-md px-2 py-1"
        value={batchable ? batchSize : 'N/A'}
        onChange={(e) => setBatchSize(parseInt(e.target.value))}
        disabled={!batchable} />
      
      <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md"  onClick={async () => { await runGpu()}}>
        {gpuRunning ? spin() : 'GPU'}
      </button>
      <div className="w-36 truncate">{gpuTime > 0 ? gpuTime : 'GPU Time: 0ms'}</div>
      <button className="bg-green-500 hover:bg-green-700 text-white px-4 py-2 rounded-md" onClick={async () => { await runWasm()}}>
        {wasmRunning ? spin() : 'WASM'}
      </button>
      <div className="w-36 truncate">{wasmTime > 0 ? wasmTime : 'WASM Time: 0ms'}</div>
      <div className="w-48">{comparison}</div>
      <CSVExportButton data={benchmarkResults} filename={name + '-benchmark'} />
    </div>
  );
};