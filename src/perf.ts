import { AleoSDKDecryptor } from "./algorithms/AleoSDKDecryptor";
import { TypescriptDecryptor } from "./algorithms/TypescriptDecryptor";
import * as jsonRecords from "../__test-infrastructure__/records.json";

const bulkRecords = 2000;
const viewKey = 'AViewKey1dgDh2cndbZR2BVBmeiQ4ccS3Zt1fRd1qbvUFs4rjZ1Xu';
const viewKeyScalar = '290071700847650793736018922990556210270687847828366881912029897283051372561'
const address = 'aleo1dc5t7s238dt4t34nxdfc2a63xay09677eh8g9pdwdsygcw8vhq8szsn3ts';

const pileOfCiphertexts: string[] = [];
for (let i = 0; i < bulkRecords; i++) {
  const jsonRecord = jsonRecords[i];
  if (jsonRecord) {
    pileOfCiphertexts.push(jsonRecord);
  }
}

console.log(pileOfCiphertexts.length);

const benchmarkBulkIsOwner = async (
  algorithm: (ciphertexts: string[], viewKey: string, address: string | null) => Promise<string[]>,
  viewKey: string,
  numRuns: number,
  address: string | null
  ): Promise<number> => {
    const perfTimes: number[] = [];
    for (let i = 0; i < numRuns; i++) {
      const start = performance.now();
      await algorithm(pileOfCiphertexts, viewKey, address);
      const end = performance.now();
      perfTimes.push(end - start);
    }
    return perfTimes.reduce((a, b) => a + b, 0) / perfTimes.length;
  };

const typescriptBenchmark = async (ciphertexts: string[], viewKey: string, address: string | null): Promise<string[]> => {
  const typescriptDecryptor = new TypescriptDecryptor();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return await typescriptDecryptor.bulkIsOwner(ciphertexts, BigInt(viewKeyScalar), address!);
};

const betterTypescriptBenchmark = async (ciphertexts: string[], viewKey: string, address: string | null): Promise<string[]> => {
  const typescriptDecryptor = new TypescriptDecryptor();
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return await typescriptDecryptor.benchmarkPrivateBulkIsOwner(ciphertexts, BigInt(viewKeyScalar), address!);
};

export const runBenchmarks = async () => {
  const numRuns = 1;

  const aleoSDKDecryptorBulkIsOwner = new AleoSDKDecryptor().bulkIsOwner;
  const wasm_bulkIsOwner_benchmark_all_owned = await benchmarkBulkIsOwner(aleoSDKDecryptorBulkIsOwner, viewKey, numRuns, null);
  console.log('wasm_bulkIsOwner_benchmark_all_owned');
  const typescript_bulkIsOwner_benchmark = await benchmarkBulkIsOwner(typescriptBenchmark, viewKey, numRuns, address);
  console.log('typescript_bulkIsOwner_benchmark');
  const better_typescript = await benchmarkBulkIsOwner(betterTypescriptBenchmark, viewKey, numRuns, address);
  console.log('better typescript');
  const benchMarkResults = {
    wasm_bulkIsOwner_all_owned: { avg_time: wasm_bulkIsOwner_benchmark_all_owned },
    typescript_bulkIsOwner: { avg_time: typescript_bulkIsOwner_benchmark },
    better_typescript: { avg_time: better_typescript },
  };

  console.table(benchMarkResults);
};
