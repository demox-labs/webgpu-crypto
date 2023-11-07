/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import CSVExportButton from './CSVExportButton';
import { random_polynomial } from '../utils/aleoWasmFunctions';
import { bigIntsToU32Array, u32ArrayToBigInts } from '../gpu/utils';
import { ntt_multipass } from '../gpu/entries/ntt/nttMultipassEntry';
import { U256WGSL } from '../gpu/wgsl/U256';
import { FieldModulusWGSL } from '../gpu/wgsl/FieldModulus';
import { prune } from '../gpu/prune';

function bit_reverse(a: bigint[]): bigint[] {
  const n = a.length;
  const logN = Math.log2(n);

  const reverseBits = (num: number, bits: number): number => {
    let reversed = 0;
    for (let i = 0; i < bits; i++) {
      reversed = (reversed << 1) | (num & 1);
      num >>= 1;
    }
    return reversed;
  };

  for (let i = 0; i < n; i++) {
    const rev = reverseBits(i, logN);
    if (i < rev) {
      [a[i], a[rev]] = [a[rev], a[i]];
    }
  }
  return a;
}

interface NTTBenchmarkProps {
  name: string;
  fieldParamsWGSL: string;
  wasmNTT: (polynomial_coeffs: string[]) => Promise<string[]>;
  rootsOfUnity: { [index: number]: bigint; };
  fieldModulus: bigint;
}

export const NTTBenchmark: React.FC<NTTBenchmarkProps> = ({
  name,
  fieldParamsWGSL,
  wasmNTT,
  rootsOfUnity,
  fieldModulus
}) => {
  const initialDefaultInputSize = 18;
  const [inputSize, setInputSize] = useState(initialDefaultInputSize);
  const [numEvaluations, setNumEvaluations] = useState(10);
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
  const [WnModules, setWnModules] = useState<string>('');
  const [ButterflyModules, setButterflyModules] = useState<string>('');
  
  const polynomialGenerator = async (inputSize: number): Promise<string[]> => {
    const polynomial = await random_polynomial(inputSize);
    return polynomial;
  }

  useEffect(() => {
    polynomialGenerator(inputSize).then((polynomial) => {
      setInputs([polynomial]);
    });
    const BaseModules = [U256WGSL, fieldParamsWGSL, FieldModulusWGSL];
    setWnModules(prune(BaseModules.join("\n"), ['gen_field_pow']));
    setButterflyModules(prune(BaseModules.join("\n"), ['gen_field_add', 'gen_field_sub', 'gen_field_multiply']));
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
    const wasmInputs = inputs;
    setWasmRunning(true);
    const wasmStart = performance.now();
    
    const results: string[] = await wasmNTT(wasmInputs[0]);
    const wasmEnd = performance.now();
    const wasmPerformance = wasmEnd - wasmStart;
    setWasmTime(wasmPerformance);
    const comparableWasmResults = results;
    setWasmResults(comparableWasmResults);
    const benchMarkResult = [inputSize, "WASM", wasmPerformance];
    setBenchmarkResults([...benchmarkResults, benchMarkResult]);
    setWasmRunning(false);
  };

  const runGpu = async () => {
    const tempInputs = inputs[0].map((input) => BigInt(input));

    setGpuRunning(true);

    const gpuStart = performance.now();
    let result: Uint32Array | undefined;
    for (let i = 0; i < numEvaluations; i++) {
      const revInputs = bit_reverse(tempInputs);
      const tmpResult = await ntt_multipass(
        { u32Inputs:  bigIntsToU32Array(revInputs), individualInputSize: 8 },
        rootsOfUnity,
        fieldModulus,
        WnModules,
        ButterflyModules
      );
      if (i === 0) {
        result = tmpResult;
      }
    }
    const gpuEnd = performance.now();
    const gpuPerformance = gpuEnd - gpuStart;

    setGpuTime(gpuPerformance);

    const bigIntResult = u32ArrayToBigInts(result || new Uint32Array(0));
    const results = bigIntResult.map(r => r.toString());

    const benchMarkResult = [inputSize, "GPU", gpuPerformance];
    setBenchmarkResults([...benchmarkResults, benchMarkResult]);

    setGpuResults(results);
    setGpuRunning(false);
  };

  const spin = () => <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin"></div>;

  return (
    <div className="flex items-center space-x-4 px-5">
      <div className="text-gray-800 font-bold w-40 px-2">{name}</div> 
      <div className="text-gray-800">Input Size (2^):</div>
      <input
        type="text"
        className="w-24 border border-gray-300 rounded-md px-2 py-1"
        value={inputSize}
        onChange={(e) => setInputSize(parseInt(e.target.value))}
      />
      <div className="text-gray-800">Evaluations</div>
      <input
        type="text"
        className="w-24 border border-gray-300 rounded-md px-2 py-1"
        value={numEvaluations}
        onChange={(e) => setNumEvaluations(parseInt(e.target.value))}
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