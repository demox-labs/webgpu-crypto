import { AleoSDKDecryptor } from "./algorithms/AleoSDKDecryptor";

const copyCiphertext = (ciphertext: string, times: number): string[] => {
  return Array<string>(times).fill(ciphertext);
};

const bulkRecords = 2;
const viewKey = 'AViewKey1dgDh2cndbZR2BVBmeiQ4ccS3Zt1fRd1qbvUFs4rjZ1Xu';
const ownedCiphertext = 'record1qyqsqqpvp730luh2dy8d9axpxravzuj8hdj9yxrs5r6jckqen4zxveg0qplra7rendesgqqzq9s5xqqzqgqgh3m299574xrquu05jztsalaymcwefzqhl6p6ep824362vpn9jpf8znfcyq5nhg6caxmz48lu8zc8dqfw5kyvqfw22ja3d0wp570hpqqkyscqqgpqp3wa6xmnl42hua0swue4rw0q5lhj6z3xxk4pfqgccawtmhjna3s0h8vnnrvhhxu8yfkpy37tw9wcyefttfm8m0p74f2xtc2ft45qy585uana3mgkk37nvp2zccqr3rjz7046g3rqspgdkn2njfx0z3tyzrgutvmap';
const notOwnedCiphertext = 'record1qyqsp6pdsdz4ddy7pgyg4nnng7qkeqthm4727vtanpa8xlx5l6vef5cfqp78mx62dw9q7qqzq9s5xqqzqgqgg7xzj28mmpff3kkuuv94cv5733t09rrpqk9ga36lrnsq9ack5yn5ca5zkpvcjy8er2gjtd097nd40gedn3qgxqwk4xjvds00ytxwq5qkyscqqgpqp6d9qxer3fv2ehrzjhzr5w7zlp5a0jrkhw9gfasq6hpthrjpsls36ju80mc2lwmww398rhxn0x49k3vpukv4g56k60rjn49lsrhuggqtrmy74qwpz05wgl5jfug9ppl2728t76svey3x34wmmv2v7sg8jqsdeegr6';

const benchmarkBulkIsOwner = async (
  algorithm: (ciphertexts: string[], viewKey: string) => Promise<string[]>,
  viewKey: string,
  ciphertext: string,
  numRuns: number
  ): Promise<number> => {
    const pileOfCiphertexts = copyCiphertext(ciphertext, bulkRecords);
    const perfTimes: number[] = [];
    for (let i = 0; i < numRuns; i++) {
      const start = performance.now();
      await algorithm(pileOfCiphertexts, viewKey);
      const end = performance.now();
      perfTimes.push(end - start);
    }
    return perfTimes.reduce((a, b) => a + b, 0) / perfTimes.length;
  };

describe('Benchmarking', () => {
  it('should benchmark bulkIsOwner algorithms', async () => {
    const numRuns = 2;

    const aleoSDKDecryptorBulkIsOwnerSlow = new AleoSDKDecryptor().bulkIsOwnerSlow;
    const aleoSDKDecryptorBulkIsOwner = new AleoSDKDecryptor().bulkIsOwner;
    const wasm_bulkIsOwnerSlow_benchmark_all_owned = await benchmarkBulkIsOwner(aleoSDKDecryptorBulkIsOwnerSlow, viewKey, ownedCiphertext, numRuns);
    const wasm_bulkIsOwnerSlow_benchmark_none_owned = await benchmarkBulkIsOwner(aleoSDKDecryptorBulkIsOwnerSlow, viewKey, notOwnedCiphertext, numRuns);
    const wasm_bulkIsOwner_benchmark_all_owned = await benchmarkBulkIsOwner(aleoSDKDecryptorBulkIsOwner, viewKey, ownedCiphertext, numRuns);
    const wasm_bulkIsOwner_benchmark_none_owned = await benchmarkBulkIsOwner(aleoSDKDecryptorBulkIsOwner, viewKey, notOwnedCiphertext, numRuns);
    
    const benchMarkResults = {
      wasm_bulkIsOwner_slow_all_owned: { avg_time: wasm_bulkIsOwnerSlow_benchmark_all_owned },
      wasm_bulkIsOwner_slow_none_owned: { avg_time: wasm_bulkIsOwnerSlow_benchmark_none_owned },
      wasm_bulkIsOwner_all_owned: { avg_time: wasm_bulkIsOwner_benchmark_all_owned },
      wasm_bulkIsOwner_none_owned: { avg_time: wasm_bulkIsOwner_benchmark_none_owned }
    };
    
    console.table(benchMarkResults);
  });
});
