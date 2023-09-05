#!/usr/bin/env node
import { Crs, newBarretenbergApiAsync, RawBuffer } from './index.js';
import createDebug from 'debug';
import { readFileSync, writeFileSync } from 'fs';
import { gunzipSync } from 'zlib';
import { Command } from 'commander';
createDebug.log = console.error.bind(console);
const debug = createDebug('bb.js');
// Maximum we support in node and the browser is 2^19.
// This is because both node and browser use barretenberg.wasm.
//
// This is not a restriction in the bb binary and one should be
// aware of this discrepancy, when creating proofs in bb versus
// creating the same proofs in the node CLI.
const MAX_CIRCUIT_SIZE = 2 ** 19;
function getBytecode(bytecodePath) {
    const encodedCircuit = readFileSync(bytecodePath, 'utf-8');
    const buffer = Buffer.from(encodedCircuit, 'base64');
    const decompressed = gunzipSync(buffer);
    return decompressed;
}
async function getGates(bytecodePath, api) {
    const { total } = await computeCircuitSize(bytecodePath, api);
    return total;
}
function getWitness(witnessPath) {
    const data = readFileSync(witnessPath);
    const decompressed = gunzipSync(data);
    return decompressed;
}
async function computeCircuitSize(bytecodePath, api) {
    debug(`computing circuit size...`);
    const bytecode = getBytecode(bytecodePath);
    const [exact, total, subgroup] = await api.acirGetCircuitSizes(bytecode);
    return { exact, total, subgroup };
}
async function init(bytecodePath, crsPath) {
    const api = await newBarretenbergApiAsync();
    const circuitSize = await getGates(bytecodePath, api);
    const subgroupSize = Math.pow(2, Math.ceil(Math.log2(circuitSize)));
    if (subgroupSize > MAX_CIRCUIT_SIZE) {
        throw new Error(`Circuit size of ${subgroupSize} exceeds max supported of ${MAX_CIRCUIT_SIZE}`);
    }
    debug(`circuit size: ${circuitSize}`);
    debug(`subgroup size: ${subgroupSize}`);
    debug('loading crs...');
    // Plus 1 needed! (Move +1 into Crs?)
    const crs = await Crs.new(subgroupSize + 1, crsPath);
    // Important to init slab allocator as first thing, to ensure maximum memory efficiency.
    await api.commonInitSlabAllocator(subgroupSize);
    // Load CRS into wasm global CRS state.
    // TODO: Make RawBuffer be default behavior, and have a specific Vector type for when wanting length prefixed.
    await api.srsInitSrs(new RawBuffer(crs.getG1Data()), crs.numPoints, new RawBuffer(crs.getG2Data()));
    const acirComposer = await api.acirNewAcirComposer(subgroupSize);
    return { api, acirComposer, circuitSize: subgroupSize };
}
async function initLite() {
    const api = await newBarretenbergApiAsync(1);
    // Plus 1 needed! (Move +1 into Crs?)
    const crs = await Crs.new(1);
    // Load CRS into wasm global CRS state.
    await api.srsInitSrs(new RawBuffer(crs.getG1Data()), crs.numPoints, new RawBuffer(crs.getG2Data()));
    const acirComposer = await api.acirNewAcirComposer(0);
    return { api, acirComposer };
}
export async function proveAndVerify(bytecodePath, witnessPath, crsPath, isRecursive) {
    const { api, acirComposer } = await init(bytecodePath, crsPath);
    try {
        debug(`creating proof...`);
        const bytecode = getBytecode(bytecodePath);
        const witness = getWitness(witnessPath);
        const proof = await api.acirCreateProof(acirComposer, bytecode, witness, isRecursive);
        debug(`verifying...`);
        const verified = await api.acirVerifyProof(acirComposer, proof, isRecursive);
        debug(`verified: ${verified}`);
        return verified;
    }
    finally {
        await api.destroy();
    }
}
export async function prove(bytecodePath, witnessPath, crsPath, isRecursive, outputPath) {
    const { api, acirComposer } = await init(bytecodePath, crsPath);
    try {
        debug(`creating proof...`);
        const bytecode = getBytecode(bytecodePath);
        const witness = getWitness(witnessPath);
        const proof = await api.acirCreateProof(acirComposer, bytecode, witness, isRecursive);
        debug(`done.`);
        if (outputPath === '-') {
            process.stdout.write(proof);
            debug(`proof written to stdout`);
        }
        else {
            writeFileSync(outputPath, proof);
            debug(`proof written to: ${outputPath}`);
        }
    }
    finally {
        await api.destroy();
    }
}
export async function gateCount(bytecodePath) {
    const api = await newBarretenbergApiAsync(1);
    try {
        process.stdout.write(`${await getGates(bytecodePath, api)}`);
    }
    finally {
        await api.destroy();
    }
}
export async function verify(proofPath, isRecursive, vkPath) {
    const { api, acirComposer } = await initLite();
    try {
        await api.acirLoadVerificationKey(acirComposer, new RawBuffer(readFileSync(vkPath)));
        const verified = await api.acirVerifyProof(acirComposer, readFileSync(proofPath), isRecursive);
        debug(`verified: ${verified}`);
        return verified;
    }
    finally {
        await api.destroy();
    }
}
export async function contract(outputPath, vkPath) {
    const { api, acirComposer } = await initLite();
    try {
        await api.acirLoadVerificationKey(acirComposer, new RawBuffer(readFileSync(vkPath)));
        const contract = await api.acirGetSolidityVerifier(acirComposer);
        if (outputPath === '-') {
            process.stdout.write(contract);
            debug(`contract written to stdout`);
        }
        else {
            writeFileSync(outputPath, contract);
            debug(`contract written to: ${outputPath}`);
        }
    }
    finally {
        await api.destroy();
    }
}
export async function writeVk(bytecodePath, crsPath, outputPath) {
    const { api, acirComposer } = await init(bytecodePath, crsPath);
    try {
        debug('initing proving key...');
        const bytecode = getBytecode(bytecodePath);
        await api.acirInitProvingKey(acirComposer, bytecode);
        debug('initing verification key...');
        const vk = await api.acirGetVerificationKey(acirComposer);
        if (outputPath === '-') {
            process.stdout.write(vk);
            debug(`vk written to stdout`);
        }
        else {
            writeFileSync(outputPath, vk);
            debug(`vk written to: ${outputPath}`);
        }
    }
    finally {
        await api.destroy();
    }
}
export async function proofAsFields(proofPath, numInnerPublicInputs, outputPath) {
    const { api, acirComposer } = await initLite();
    try {
        debug('serializing proof byte array into field elements');
        const proofAsFields = await api.acirSerializeProofIntoFields(acirComposer, readFileSync(proofPath), numInnerPublicInputs);
        const jsonProofAsFields = JSON.stringify(proofAsFields.map(f => f.toString()));
        if (outputPath === '-') {
            process.stdout.write(jsonProofAsFields);
            debug(`proofAsFields written to stdout`);
        }
        else {
            writeFileSync(outputPath, jsonProofAsFields);
            debug(`proofAsFields written to: ${outputPath}`);
        }
        debug('done.');
    }
    finally {
        await api.destroy();
    }
}
export async function vkAsFields(vkPath, vkeyOutputPath) {
    const { api, acirComposer } = await initLite();
    try {
        debug('serializing vk byte array into field elements');
        await api.acirLoadVerificationKey(acirComposer, new RawBuffer(readFileSync(vkPath)));
        const [vkAsFields, vkHash] = await api.acirSerializeVerificationKeyIntoFields(acirComposer);
        const output = [vkHash, ...vkAsFields].map(f => f.toString());
        const jsonVKAsFields = JSON.stringify(output);
        if (vkeyOutputPath === '-') {
            process.stdout.write(jsonVKAsFields);
            debug(`vkAsFields written to stdout`);
        }
        else {
            writeFileSync(vkeyOutputPath, jsonVKAsFields);
            debug(`vkAsFields written to: ${vkeyOutputPath}`);
        }
        debug('done.');
    }
    finally {
        await api.destroy();
    }
}
const program = new Command();
program.option('-v, --verbose', 'enable verbose logging', false);
program.option('-c, --crs-path <path>', 'set crs path', './crs');
function handleGlobalOptions() {
    if (program.opts().verbose) {
        createDebug.enable('bb.js*');
    }
}
program
    .command('prove_and_verify')
    .description('Generate a proof and verify it. Process exits with success or failure code.')
    .option('-b, --bytecode-path <path>', 'Specify the bytecode path', './target/main.bytecode')
    .option('-w, --witness-path <path>', 'Specify the witness path', './target/witness.tr')
    .option('-r, --recursive', 'prove and verify using recursive prover and verifier', false)
    .action(async ({ bytecodePath, witnessPath, recursive, crsPath }) => {
    handleGlobalOptions();
    const result = await proveAndVerify(bytecodePath, witnessPath, crsPath, recursive);
    process.exit(result ? 0 : 1);
});
program
    .command('prove')
    .description('Generate a proof and write it to a file.')
    .option('-b, --bytecode-path <path>', 'Specify the bytecode path', './target/main.bytecode')
    .option('-w, --witness-path <path>', 'Specify the witness path', './target/witness.tr')
    .option('-r, --recursive', 'prove using recursive prover', false)
    .option('-o, --output-path <path>', 'Specify the proof output path', './proofs/proof')
    .action(async ({ bytecodePath, witnessPath, recursive, outputPath, crsPath }) => {
    handleGlobalOptions();
    await prove(bytecodePath, witnessPath, crsPath, recursive, outputPath);
});
program
    .command('gates')
    .description('Print gate count to standard output.')
    .option('-b, --bytecode-path <path>', 'Specify the bytecode path', './target/main.bytecode')
    .action(async ({ bytecodePath: bytecodePath }) => {
    handleGlobalOptions();
    await gateCount(bytecodePath);
});
program
    .command('verify')
    .description('Verify a proof. Process exists with success or failure code.')
    .requiredOption('-p, --proof-path <path>', 'Specify the path to the proof')
    .option('-r, --recursive', 'prove using recursive prover', false)
    .requiredOption('-k, --vk <path>', 'path to a verification key. avoids recomputation.')
    .action(async ({ proofPath, recursive, vk }) => {
    handleGlobalOptions();
    const result = await verify(proofPath, recursive, vk);
    process.exit(result ? 0 : 1);
});
program
    .command('contract')
    .description('Output solidity verification key contract.')
    .option('-b, --bytecode-path <path>', 'Specify the bytecode path', './target/main.bytecode')
    .option('-o, --output-path <path>', 'Specify the path to write the contract', './target/contract.sol')
    .requiredOption('-k, --vk <path>', 'path to a verification key. avoids recomputation.')
    .action(async ({ outputPath, vk }) => {
    handleGlobalOptions();
    await contract(outputPath, vk);
});
program
    .command('write_vk')
    .description('Output verification key.')
    .option('-b, --bytecode-path <path>', 'Specify the bytecode path', './target/main.bytecode')
    .requiredOption('-o, --output-path <path>', 'Specify the path to write the key')
    .action(async ({ bytecodePath, outputPath, crsPath }) => {
    handleGlobalOptions();
    await writeVk(bytecodePath, crsPath, outputPath);
});
program
    .command('proof_as_fields')
    .description('Return the proof as fields elements')
    .requiredOption('-p, --proof-path <path>', 'Specify the proof path')
    .requiredOption('-n, --num-public-inputs <number>', 'Specify the number of public inputs')
    .requiredOption('-o, --output-path <path>', 'Specify the JSON path to write the proof fields')
    .action(async ({ proofPath, numPublicInputs, outputPath }) => {
    handleGlobalOptions();
    await proofAsFields(proofPath, numPublicInputs, outputPath);
});
program
    .command('vk_as_fields')
    .description('Return the verification key represented as fields elements. Also return the verification key hash.')
    .requiredOption('-i, --input-path <path>', 'Specifies the vk path (output from write_vk)')
    .requiredOption('-o, --output-path <path>', 'Specify the JSON path to write the verification key fields and key hash')
    .action(async ({ inputPath, outputPath }) => {
    handleGlobalOptions();
    await vkAsFields(inputPath, outputPath);
});
program.name('bb.js').parse(process.argv);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBQUUsR0FBRyxFQUF3Qix1QkFBdUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDM0YsT0FBTyxXQUFXLE1BQU0sT0FBTyxDQUFDO0FBQ2hDLE9BQU8sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFdBQVcsQ0FBQztBQUVwQyxXQUFXLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzlDLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUVuQyxzREFBc0Q7QUFDdEQsK0RBQStEO0FBQy9ELEVBQUU7QUFDRiwrREFBK0Q7QUFDL0QsK0RBQStEO0FBQy9ELDRDQUE0QztBQUM1QyxNQUFNLGdCQUFnQixHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFakMsU0FBUyxXQUFXLENBQUMsWUFBb0I7SUFDdkMsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMzRCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNyRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEMsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVELEtBQUssVUFBVSxRQUFRLENBQUMsWUFBb0IsRUFBRSxHQUF5QjtJQUNyRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxZQUFZLEVBQUUsR0FBRyxDQUFD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