/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import CSVExportButton from './CSVExportButton';
import { bigIntsToU32Array, u32ArrayToBigInts } from '../gpu/utils';
import { ntt_multipass } from '../gpu/entries/ntt/nttMultipassEntry';
import { ntt, randomPolynomial } from '../barretenberg-wasm-loader/wasm-functions';
import { FIELD_MODULUS, ROOTS_OF_UNITY } from '../params/BN254Constants';
import { Fr } from '../barretenberg-wasm-loader/dest/browser/types';
import { BN254ParamsWGSL } from '../gpu/wgsl/BN254Params';


function bit_reverse(a: bigint[]): bigint[] {
  const n = a.length;
  const logN = Math.log2(n);

  for (let i = 0; i < n; i++) {
    const j = i.toString(2).padStart(logN, '0').split('').reverse().join('');
    const rev = parseInt(j, 2);
    if (i < rev) {
        [a[i], a[rev]] = [a[rev], a[i]];
    }
  }
  return a;
}

export const NTTBN254Benchmark: React.FC = () => {
  const initialDefaultInputSize = 10;
  const [inputSize, setInputSize] = useState(initialDefaultInputSize);
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
  
  const polynomialGenerator = async (inputSize: number): Promise<string[]> => {
    const polynomial = await randomPolynomial(inputSize);
    return polynomial.map(i => i.value.toString());
  }

  useEffect(() => {
    polynomialGenerator(inputSize).then((polynomial) => {
      setInputs([polynomial]);
    });
  }, []);

  useEffect(() => {
    polynomialGenerator(inputSize).then((polynomial) => {
      setInputs([polynomial]);
    });
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
    const wasmInputs = inputs;
    setWasmRunning(true);
    const wasmStart = performance.now();
    const results: string[] = (await ntt(wasmInputs[0])).map((fr: Fr) => fr.value.toString());
    const wasmEnd = performance.now();
    const wasmPerformance = wasmEnd - wasmStart;
    setWasmTime(wasmPerformance);
    const comparableWasmResults = results;
    console.log('results...');
    console.log(comparableWasmResults);
    setWasmResults(comparableWasmResults);
    const benchMarkResult = [inputSize, "WASM", wasmPerformance];
    setBenchmarkResults([...benchmarkResults, benchMarkResult]);
    setWasmRunning(false);
  };

  const runGpu = async () => {
    const tempInputs = inputs[0].map((input) => BigInt(input));

    setGpuRunning(true);

    const gpuStart = performance.now();
    const revInputs = bit_reverse(tempInputs);
    console.log('time to rev: ', performance.now() - gpuStart);
    const result = await ntt_multipass(
      { u32Inputs:  bigIntsToU32Array(revInputs),
        individualInputSize: 8 },
        ROOTS_OF_UNITY,
        FIELD_MODULUS,
        BN254ParamsWGSL
    );
    const gpuEnd = performance.now();
    const gpuPerformance = gpuEnd - gpuStart;

    setGpuTime(gpuPerformance);

    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    const results = bigIntResult.map(r => r.toString());
    console.log('gpu results...');
    console.log(results);

    setGpuResults(results);
    setGpuRunning(false);
  };

  const spin = () => <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>;

  return (
    <div className="flex items-center space-x-4 px-5">
      <div className="text-gray-800 font-bold w-40 px-2">NTT BN254 Multipass</div> 
      <div className="text-gray-800">Input Size (2^):</div>
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
      <CSVExportButton data={benchmarkResults} filename={name + '-benchmark'} />
    </div>
  );
};