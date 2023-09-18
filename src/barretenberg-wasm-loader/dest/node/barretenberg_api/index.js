import { BufferDeserializer, NumberDeserializer, VectorDeserializer, BoolDeserializer, StringDeserializer, } from '../serialize/index.js';
import { Fr, Fq, Point, Buffer32, Buffer128, Ptr } from '../types/index.js';
export class BarretenbergApi {
    constructor(binder) {
        this.binder = binder;
    }
    async destroy() {
        await this.binder.wasm.destroy();
    }
    async randomPoint() {
        const result = await this.binder.callWasmExport('bn254_random_point', [], [Point]);
        return result[0];
    }
    async addFields(left, right) {
        const result = await this.binder.callWasmExport('bn254_add_fields', [left, right], [Fq]);
        return result[0];
    }
    async subFields(left, right) {
        const result = await this.binder.callWasmExport('bn254_sub_fields', [left, right], [Fq]);
        return result[0];
    }
    async mulFields(left, right) {
        const result = await this.binder.callWasmExport('bn254_mul_fields', [left, right], [Fq]);
        return result[0];
    }
    async invertField(input) {
        const result = await this.binder.callWasmExport('bn254_invert_field', [input], [Fq]);
        return result[0];
    }
    async expField(base, exp) {
        const result = await this.binder.callWasmExport('bn254_exp_field', [base, exp], [Fq]);
        return result[0];
    }
    async sqrtField(base) {
        const result = await this.binder.callWasmExport('bn254_sqrt_field', [base], [Fq]);
        return result[0];
    }
    async pedersenInit() {
        const result = await this.binder.callWasmExport('pedersen___init', [], []);
        return;
    }
    async pedersenCompressFields(left, right) {
        const result = await this.binder.callWasmExport('pedersen___compress_fields', [left, right], [Fr]);
        return result[0];
    }
    async pedersenPlookupCompressFields(left, right) {
        const result = await this.binder.callWasmExport('pedersen___plookup_compress_fields', [left, right], [Fr]);
        return result[0];
    }
    async pedersenCompress(inputsBuffer) {
        const result = await this.binder.callWasmExport('pedersen___compress', [inputsBuffer], [Fr]);
        return result[0];
    }
    async pedersenPlookupCompress(inputsBuffer) {
        const result = await this.binder.callWasmExport('pedersen___plookup_compress', [inputsBuffer], [Fr]);
        return result[0];
    }
    async pedersenCompressWithHashIndex(inputsBuffer, hashIndex) {
        const result = await this.binder.callWasmExport('pedersen___compress_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    async pedersenCommit(inputsBuffer) {
        const result = await this.binder.callWasmExport('pedersen___commit', [inputsBuffer], [Fr]);
        return result[0];
    }
    async pedersenPlookupCommit(inputsBuffer) {
        const result = await this.binder.callWasmExport('pedersen___plookup_commit', [inputsBuffer], [Fr]);
        return result[0];
    }
    async pedersenPlookupCommitWithHashIndex(inputsBuffer, hashIndex) {
        const result = await this.binder.callWasmExport('pedersen___plookup_commit_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    async pedersenBufferToField(data) {
        const result = await this.binder.callWasmExport('pedersen___buffer_to_field', [data], [Fr]);
        return result[0];
    }
    async pedersenHashInit() {
        const result = await this.binder.callWasmExport('pedersen_hash_init', [], []);
        return;
    }
    async pedersenHashPair(left, right) {
        const result = await this.binder.callWasmExport('pedersen_hash_pair', [left, right], [Fr]);
        return result[0];
    }
    async pedersenHashMultiple(inputsBuffer) {
        const result = await this.binder.callWasmExport('pedersen_hash_multiple', [inputsBuffer], [Fr]);
        return result[0];
    }
    async pedersenHashMultipleWithHashIndex(inputsBuffer, hashIndex) {
        const result = await this.binder.callWasmExport('pedersen_hash_multiple_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    async pedersenHashToTree(data) {
        const result = await this.binder.callWasmExport('pedersen_hash_to_tree', [data], [VectorDeserializer(Fr)]);
        return result[0];
    }
    async blake2s(data) {
        const result = await this.binder.callWasmExport('blake2s', [data], [Buffer32]);
        return result[0];
    }
    async blake2sToField(data) {
        const result = await this.binder.callWasmExport('blake2s_to_field_', [data], [Fr]);
        return result[0];
    }
    async schnorrComputePublicKey(privateKey) {
        const result = await this.binder.callWasmExport('schnorr_compute_public_key', [privateKey], [Point]);
        return result[0];
    }
    async schnorrNegatePublicKey(publicKeyBuffer) {
        const result = await this.binder.callWasmExport('schnorr_negate_public_key', [publicKeyBuffer], [Point]);
        return result[0];
    }
    async schnorrConstructSignature(message, privateKey) {
        const result = await this.binder.callWasmExport('schnorr_construct_signature', [message, privateKey], [Buffer32, Buffer32]);
        return result;
    }
    async schnorrVerifySignature(message, pubKey, sigS, sigE) {
        const result = await this.binder.callWasmExport('schnorr_verify_signature', [message, pubKey, sigS, sigE], [BoolDeserializer()]);
        return result[0];
    }
    async schnorrMultisigCreateMultisigPublicKey(privateKey) {
        const result = await this.binder.callWasmExport('schnorr_multisig_create_multisig_public_key', [privateKey], [Buffer128]);
        return result[0];
    }
    async schnorrMultisigValidateAndCombineSignerPubkeys(signerPubkeyBuf) {
        const result = await this.binder.callWasmExport('schnorr_multisig_validate_and_combine_signer_pubkeys', [signerPubkeyBuf], [Point, BoolDeserializer()]);
        return result;
    }
    async schnorrMultisigConstructSignatureRound1() {
        const result = await this.binder.callWasmExport('schnorr_multisig_construct_signature_round_1', [], [Buffer128, Buffer128]);
        return result;
    }
    async schnorrMultisigConstructSignatureRound2(message, privateKey, signerRoundOnePrivateBuf, signerPubkeysBuf, roundOnePublicBuf) {
        const result = await this.binder.callWasmExport('schnorr_multisig_construct_signature_round_2', [message, privateKey, signerRoundOnePrivateBuf, signerPubkeysBuf, roundOnePublicBuf], [Fq, BoolDeserializer()]);
        return result;
    }
    async schnorrMultisigCombineSignatures(message, signerPubkeysBuf, roundOneBuf, roundTwoBuf) {
        const result = await this.binder.callWasmExport('schnorr_multisig_combine_signatures', [message, signerPubkeysBuf, roundOneBuf, roundTwoBuf], [Buffer32, Buffer32, BoolDeserializer()]);
        return result;
    }
    async srsInitSrs(pointsBuf, numPoints, g2PointBuf) {
        const result = await this.binder.callWasmExport('srs_init_srs', [pointsBuf, numPoints, g2PointBuf], []);
        return;
    }
    async examplesSimpleCreateAndVerifyProof() {
        const result = await this.binder.callWasmExport('examples_simple_create_and_verify_proof', [], [BoolDeserializer()]);
        return result[0];
    }
    async testThreads(threads, iterations) {
        const result = await this.binder.callWasmExport('test_threads', [threads, iterations], [NumberDeserializer()]);
        return result[0];
    }
    async testThreadAbort() {
        const result = await this.binder.callWasmExport('test_thread_abort', [], []);
        return;
    }
    async testAbort() {
        const result = await this.binder.callWasmExport('test_abort', [], []);
        return;
    }
    async commonInitSlabAllocator(circuitSize) {
        const result = await this.binder.callWasmExport('common_init_slab_allocator', [circuitSize], []);
        return;
    }
    async acirGetCircuitSizes(constraintSystemBuf) {
        const result = await this.binder.callWasmExport('acir_get_circuit_sizes', [constraintSystemBuf], [NumberDeserializer(), NumberDeserializer(), NumberDeserializer()]);
        return result;
    }
    async acirNewAcirComposer(sizeHint) {
        const result = await this.binder.callWasmExport('acir_new_acir_composer', [sizeHint], [Ptr]);
        return result[0];
    }
    async acirDeleteAcirComposer(acirComposerPtr) {
        const result = await this.binder.callWasmExport('acir_delete_acir_composer', [acirComposerPtr], []);
        return;
    }
    async acirCreateCircuit(acirComposerPtr, constraintSystemBuf, sizeHint) {
        const result = await this.binder.callWasmExport('acir_create_circuit', [acirComposerPtr, constraintSystemBuf, sizeHint], []);
        return;
    }
    async acirInitProvingKey(acirComposerPtr, constraintSystemBuf) {
        const result = await this.binder.callWasmExport('acir_init_proving_key', [acirComposerPtr, constraintSystemBuf], []);
        return;
    }
    async acirCreateProof(acirComposerPtr, constraintSystemBuf, witnessBuf, isRecursive) {
        const result = await this.binder.callWasmExport('acir_create_proof', [acirComposerPtr, constraintSystemBuf, witnessBuf, isRecursive], [BufferDeserializer()]);
        return result[0];
    }
    async acirLoadVerificationKey(acirComposerPtr, vkBuf) {
        const result = await this.binder.callWasmExport('acir_load_verification_key', [acirComposerPtr, vkBuf], []);
        return;
    }
    async acirInitVerificationKey(acirComposerPtr) {
        const result = await this.binder.callWasmExport('acir_init_verification_key', [acirComposerPtr], []);
        return;
    }
    async acirGetVerificationKey(acirComposerPtr) {
        const result = await this.binder.callWasmExport('acir_get_verification_key', [acirComposerPtr], [BufferDeserializer()]);
        return result[0];
    }
    async acirVerifyProof(acirComposerPtr, proofBuf, isRecursive) {
        const result = await this.binder.callWasmExport('acir_verify_proof', [acirComposerPtr, proofBuf, isRecursive], [BoolDeserializer()]);
        return result[0];
    }
    async acirGetSolidityVerifier(acirComposerPtr) {
        const result = await this.binder.callWasmExport('acir_get_solidity_verifier', [acirComposerPtr], [StringDeserializer()]);
        return result[0];
    }
    async acirSerializeProofIntoFields(acirComposerPtr, proofBuf, numInnerPublicInputs) {
        const result = await this.binder.callWasmExport('acir_serialize_proof_into_fields', [acirComposerPtr, proofBuf, numInnerPublicInputs], [VectorDeserializer(Fr)]);
        return result[0];
    }
    async acirSerializeVerificationKeyIntoFields(acirComposerPtr) {
        const result = await this.binder.callWasmExport('acir_serialize_verification_key_into_fields', [acirComposerPtr], [VectorDeserializer(Fr), Fr]);
        return result;
    }
    async fft(coeff, evaulation_domain) {
        const result = await this.binder.callWasmExport('fft', [coeff, evaulation_domain], [VectorDeserializer(Fr)]);
        return result[0];
    }
    async randomPolynomial(degree) {
        const result = await this.binder.callWasmExport('random_polynomial', [degree], [VectorDeserializer(Fr)]);
        return result[0];
    }
    async newEvaluationDomain(degree) {
        const result = await this.binder.callWasmExport('new_evaluation_domain', [degree], [Ptr]);
        return result[0];
    }
}
export class BarretenbergApiSync {
    constructor(binder) {
        this.binder = binder;
    }
    async destroy() {
        await this.binder.wasm.destroy();
    }
    randomPoint() {
        const result = this.binder.callWasmExport('bn254_random_point', [], [Point]);
        return result[0];
    }
    addPoints(p1X, p1Y, p2X, p2Y) {
        const result = this.binder.callWasmExport('bn254_add_points', [p1X, p1Y, p2X, p2Y], [Fq, Fq]);
        return [result[0], result[1]];
    }
    doublePoint(pX, pY) {
        const result = this.binder.callWasmExport('bn254_double_point', [pX, pY], [Fq, Fq]);
        return [result[0], result[1]];
    }
    addFields(left, right) {
        const result = this.binder.callWasmExport('bn254_add_fields', [left, right], [Fq]);
        return result[0];
    }
    subFields(left, right) {
        const result = this.binder.callWasmExport('bn254_sub_fields', [left, right], [Fq]);
        return result[0];
    }
    mulFields(left, right) {
        const result = this.binder.callWasmExport('bn254_mul_fields', [left, right], [Fq]);
        return result[0];
    }
    invertField(input) {
        const result = this.binder.callWasmExport('bn254_invert_field', [input], [Fq]);
        return result[0];
    }
    expField(base, exp) {
        const result = this.binder.callWasmExport('bn254_exp_field', [base, exp], [Fq]);
        return result[0];
    }
    sqrtField(base) {
        const result = this.binder.callWasmExport('bn254_sqrt_field', [base], [Fq]);
        return result[0];
    }
    pedersenInit() {
        const result = this.binder.callWasmExport('pedersen___init', [], []);
        return;
    }
    pedersenCompressFields(left, right) {
        const result = this.binder.callWasmExport('pedersen___compress_fields', [left, right], [Fr]);
        return result[0];
    }
    pedersenPlookupCompressFields(left, right) {
        const result = this.binder.callWasmExport('pedersen___plookup_compress_fields', [left, right], [Fr]);
        return result[0];
    }
    pedersenCompress(inputsBuffer) {
        const result = this.binder.callWasmExport('pedersen___compress', [inputsBuffer], [Fr]);
        return result[0];
    }
    pedersenPlookupCompress(inputsBuffer) {
        const result = this.binder.callWasmExport('pedersen___plookup_compress', [inputsBuffer], [Fr]);
        return result[0];
    }
    pedersenCompressWithHashIndex(inputsBuffer, hashIndex) {
        const result = this.binder.callWasmExport('pedersen___compress_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    pedersenCommit(inputsBuffer) {
        const result = this.binder.callWasmExport('pedersen___commit', [inputsBuffer], [Fr]);
        return result[0];
    }
    pedersenPlookupCommit(inputsBuffer) {
        const result = this.binder.callWasmExport('pedersen___plookup_commit', [inputsBuffer], [Fr]);
        return result[0];
    }
    pedersenPlookupCommitWithHashIndex(inputsBuffer, hashIndex) {
        const result = this.binder.callWasmExport('pedersen___plookup_commit_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    pedersenBufferToField(data) {
        const result = this.binder.callWasmExport('pedersen___buffer_to_field', [data], [Fr]);
        return result[0];
    }
    pedersenHashInit() {
        const result = this.binder.callWasmExport('pedersen_hash_init', [], []);
        return;
    }
    pedersenHashPair(left, right) {
        const result = this.binder.callWasmExport('pedersen_hash_pair', [left, right], [Fr]);
        return result[0];
    }
    pedersenHashMultiple(inputsBuffer) {
        const result = this.binder.callWasmExport('pedersen_hash_multiple', [inputsBuffer], [Fr]);
        return result[0];
    }
    pedersenHashMultipleWithHashIndex(inputsBuffer, hashIndex) {
        const result = this.binder.callWasmExport('pedersen_hash_multiple_with_hash_index', [inputsBuffer, hashIndex], [Fr]);
        return result[0];
    }
    pedersenHashToTree(data) {
        const result = this.binder.callWasmExport('pedersen_hash_to_tree', [data], [VectorDeserializer(Fr)]);
        return result[0];
    }
    blake2s(data) {
        const result = this.binder.callWasmExport('blake2s', [data], [Buffer32]);
        return result[0];
    }
    blake2sToField(data) {
        const result = this.binder.callWasmExport('blake2s_to_field_', [data], [Fr]);
        return result[0];
    }
    schnorrComputePublicKey(privateKey) {
        const result = this.binder.callWasmExport('schnorr_compute_public_key', [privateKey], [Point]);
        return result[0];
    }
    schnorrNegatePublicKey(publicKeyBuffer) {
        const result = this.binder.callWasmExport('schnorr_negate_public_key', [publicKeyBuffer], [Point]);
        return result[0];
    }
    schnorrConstructSignature(message, privateKey) {
        const result = this.binder.callWasmExport('schnorr_construct_signature', [message, privateKey], [Buffer32, Buffer32]);
        return result;
    }
    schnorrVerifySignature(message, pubKey, sigS, sigE) {
        const result = this.binder.callWasmExport('schnorr_verify_signature', [message, pubKey, sigS, sigE], [BoolDeserializer()]);
        return result[0];
    }
    schnorrMultisigCreateMultisigPublicKey(privateKey) {
        const result = this.binder.callWasmExport('schnorr_multisig_create_multisig_public_key', [privateKey], [Buffer128]);
        return result[0];
    }
    schnorrMultisigValidateAndCombineSignerPubkeys(signerPubkeyBuf) {
        const result = this.binder.callWasmExport('schnorr_multisig_validate_and_combine_signer_pubkeys', [signerPubkeyBuf], [Point, BoolDeserializer()]);
        return result;
    }
    schnorrMultisigConstructSignatureRound1() {
        const result = this.binder.callWasmExport('schnorr_multisig_construct_signature_round_1', [], [Buffer128, Buffer128]);
        return result;
    }
    schnorrMultisigConstructSignatureRound2(message, privateKey, signerRoundOnePrivateBuf, signerPubkeysBuf, roundOnePublicBuf) {
        const result = this.binder.callWasmExport('schnorr_multisig_construct_signature_round_2', [message, privateKey, signerRoundOnePrivateBuf, signerPubkeysBuf, roundOnePublicBuf], [Fq, BoolDeserializer()]);
        return result;
    }
    schnorrMultisigCombineSignatures(message, signerPubkeysBuf, roundOneBuf, roundTwoBuf) {
        const result = this.binder.callWasmExport('schnorr_multisig_combine_signatures', [message, signerPubkeysBuf, roundOneBuf, roundTwoBuf], [Buffer32, Buffer32, BoolDeserializer()]);
        return result;
    }
    srsInitSrs(pointsBuf, numPoints, g2PointBuf) {
        const result = this.binder.callWasmExport('srs_init_srs', [pointsBuf, numPoints, g2PointBuf], []);
        return;
    }
    examplesSimpleCreateAndVerifyProof() {
        const result = this.binder.callWasmExport('examples_simple_create_and_verify_proof', [], [BoolDeserializer()]);
        return result[0];
    }
    testThreads(threads, iterations) {
        const result = this.binder.callWasmExport('test_threads', [threads, iterations], [NumberDeserializer()]);
        return result[0];
    }
    testThreadAbort() {
        const result = this.binder.callWasmExport('test_thread_abort', [], []);
        return;
    }
    testAbort() {
        const result = this.binder.callWasmExport('test_abort', [], []);
        return;
    }
    commonInitSlabAllocator(circuitSize) {
        const result = this.binder.callWasmExport('common_init_slab_allocator', [circuitSize], []);
        return;
    }
    acirGetCircuitSizes(constraintSystemBuf) {
        const result = this.binder.callWasmExport('acir_get_circuit_sizes', [constraintSystemBuf], [NumberDeserializer(), NumberDeserializer(), NumberDeserializer()]);
        return result;
    }
    acirNewAcirComposer(sizeHint) {
        const result = this.binder.callWasmExport('acir_new_acir_composer', [sizeHint], [Ptr]);
        return result[0];
    }
    acirDeleteAcirComposer(acirComposerPtr) {
        const result = this.binder.callWasmExport('acir_delete_acir_composer', [acirComposerPtr], []);
        return;
    }
    acirCreateCircuit(acirComposerPtr, constraintSystemBuf, sizeHint) {
        const result = this.binder.callWasmExport('acir_create_circuit', [acirComposerPtr, constraintSystemBuf, sizeHint], []);
        return;
    }
    acirInitProvingKey(acirComposerPtr, constraintSystemBuf) {
        const result = this.binder.callWasmExport('acir_init_proving_key', [acirComposerPtr, constraintSystemBuf], []);
        return;
    }
    acirCreateProof(acirComposerPtr, constraintSystemBuf, witnessBuf, isRecursive) {
        const result = this.binder.callWasmExport('acir_create_proof', [acirComposerPtr, constraintSystemBuf, witnessBuf, isRecursive], [BufferDeserializer()]);
        return result[0];
    }
    acirLoadVerificationKey(acirComposerPtr, vkBuf) {
        const result = this.binder.callWasmExport('acir_load_verification_key', [acirComposerPtr, vkBuf], []);
        return;
    }
    acirInitVerificationKey(acirComposerPtr) {
        const result = this.binder.callWasmExport('acir_init_verification_key', [acirComposerPtr], []);
        return;
    }
    acirGetVerificationKey(acirComposerPtr) {
        const result = this.binder.callWasmExport('acir_get_verification_key', [acirComposerPtr], [BufferDeserializer()]);
        return result[0];
    }
    acirVerifyProof(acirComposerPtr, proofBuf, isRecursive) {
        const result = this.binder.callWasmExport('acir_verify_proof', [acirComposerPtr, proofBuf, isRecursive], [BoolDeserializer()]);
        return result[0];
    }
    acirGetSolidityVerifier(acirComposerPtr) {
        const result = this.binder.callWasmExport('acir_get_solidity_verifier', [acirComposerPtr], [StringDeserializer()]);
        return result[0];
    }
    acirSerializeProofIntoFields(acirComposerPtr, proofBuf, numInnerPublicInputs) {
        const result = this.binder.callWasmExport('acir_serialize_proof_into_fields', [acirComposerPtr, proofBuf, numInnerPublicInputs], [VectorDeserializer(Fr)]);
        return result[0];
    }
    acirSerializeVerificationKeyIntoFields(acirComposerPtr) {
        const result = this.binder.callWasmExport('acir_serialize_verification_key_into_fields', [acirComposerPtr], [VectorDeserializer(Fr), Fr]);
        return result;
    }
    fft(coeff, evaulation_domain) {
        const result = this.binder.callWasmExport('fft', [coeff, evaulation_domain], [VectorDeserializer(Fr)]);
        return result[0];
    }
    randomPolynomial(degree) {
        const result = this.binder.callWasmExport('random_polynomial', [degree], [VectorDeserializer(Fr)]);
        return result[0];
    }
    newEvaluationDomain(degree) {
        const result = this.binder.callWasmExport('new_evaluation_domain', [degree], [Ptr]);
        return result[0];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYmFycmV0ZW5iZXJnX2FwaS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBQ0wsa0JBQWtCLEVBQ2xCLGtCQUFrQixFQUNsQixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLGtCQUFrQixHQUNuQixNQUFNLHVCQUF1QixDQUFDO0FBQy9CLE9BQU8sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBRTVFLE1BQU0sT0FBTyxlQUFlO0lBQzFCLFlBQW1CLE1BQTBCO1FBQTFCLFdBQU0sR0FBTixNQUFNLENBQW9CO0lBQUcsQ0FBQztJQUVqRCxLQUFLLENBQUMsT0FBTztRQUNYLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxXQUFXO1FBQ2YsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ25GLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLElBQVEsRUFBRSxLQUFTO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pGLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLElBQVEsRUFBRSxLQUFTO1FBQ2pD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