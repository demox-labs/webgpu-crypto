// import { BLS, G1 } from "@celo/bls12377js";
import { CurveFn, ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { sha512 } from '@noble/hashes/sha512';
import { poseidon, PoseidonOpts } from '@noble/curves/abstract/poseidon';
import { Field } from "@noble/curves/abstract/modular";
import { randomBytes } from "crypto";
import { aleoMdStrings, aleoRoundConstantStrings } from "../params/PoseidonParams";

// base field modulus https://docs.rs/ark-ed-on-bls12-377/latest/ark_ed_on_bls12_377/
export const aleoFieldOrder = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');
export const Fp = Field(aleoFieldOrder, undefined, true);

export const getPointFromX = (x_field: bigint): { x: bigint, y: bigint } => {
    // Convert x to BigInt
  // Compute y^2 = (1 - x^2) / (1 + d * x^2) mod F

  const xSquared = Fp.sqr(x_field);

  const numerator = Fp.sub(Fp.mul(aleoA, xSquared), BigInt(1));
  const denominator = Fp.sub(Fp.mul(aleoD, xSquared), BigInt(1));
  const ySquared = Fp.mul(numerator, Fp.inv(denominator));
  const y = Fp.sqrt(ySquared);

  const aleoEdwards = customEdwards();

  // Create the point object
  const topPoint = aleoEdwards.ExtendedPoint.fromAffine({ x: x_field, y: y });

  // modulus of the bls12-377 subgroup Scalar Field
  const subgroupCharacteristic = BigInt('2111115437357092606062206234695386632838870926408408195193685246394721360383');
  const multipliedTopPoint = topPoint.multiplyUnsafe(subgroupCharacteristic).toAffine();

  if (multipliedTopPoint.x === BigInt(0) && multipliedTopPoint.y === BigInt(1)) {
    return topPoint;
  } else {
    const negY = Fp.neg(y);
    return aleoEdwards.ExtendedPoint.fromAffine({ x: x_field, y: negY });
  }
}

export const subtract = (x: bigint, y: bigint): bigint => {
  return Fp.sub(x, y);
};

export const multiply = (nonce_x: bigint, nonce_y: bigint, scalar: bigint): { x: bigint, y: bigint } => {
  // Get the curve point in extended coordinates
  const aleoEdwards = customEdwards();
  const point = aleoEdwards.ExtendedPoint.fromAffine({ x: nonce_x, y: nonce_y });

  // Perform scalar multiplication
  // const result = point.multiply(bigIntScalar);
  const unsafeResult = point.multiplyUnsafe(scalar);

  // Convert the result to affine coordinates
  // const resultAffine = result.toAffine();
  // faster, but leaks info about the underlying data
  const unsafeResultAffine = unsafeResult.toAffine();

  return unsafeResultAffine;
}

const encryptionDomain = BigInt('1187534166381405136191308758137566032926460981470575291457');
const poseidonDomain = BigInt('4470955116825994810352013241409');
const aleoMdsAsBigInts = aleoMdStrings.map(row => row.map(elm => Fp.create(BigInt(elm))));
const aleoRoundConstantsAsBigInts = aleoRoundConstantStrings.map(row => row.map(elm => Fp.create(BigInt(elm))));
// const poseidonField = Field(poseidonDomain, undefined, true);

export const poseidonHash = (recordViewKey: bigint): bigint => {
  // const expectedResultBigInt = BigInt(expectedResult);
  const aleoPoseidonOpts: PoseidonOpts = {
    Fp,
    t: 9,
    roundsFull: 8,
    roundsPartial: 31,
    sboxPower: 17,
    mds: aleoMdsAsBigInts,
    roundConstants: aleoRoundConstantsAsBigInts
  };

  const aleoPoseidon = poseidon(aleoPoseidonOpts);
  const firstHashInput = [BigInt(0), poseidonDomain, BigInt(2), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)];
  const firstHashOutput = aleoPoseidon(firstHashInput);
  const secondElement = firstHashOutput[1];
  const thirdElement = firstHashOutput[2];
  const secondElementPlus = Fp.add(secondElement, encryptionDomain);
  const thirdElementPlus = Fp.add(thirdElement, recordViewKey);
  firstHashOutput[1] = secondElementPlus;
  firstHashOutput[2] = thirdElementPlus;
  const secondHashOutput = aleoPoseidon(firstHashOutput);
  return secondHashOutput[1];
}

export const poseidonHashFast = (recordViewKey: bigint): bigint => {
  // const expectedResultBigInt = BigInt(expectedResult);
  const aleoPoseidonOpts: PoseidonOpts = {
    Fp,
    t: 9,
    roundsFull: 8,
    roundsPartial: 31,
    sboxPower: 17,
    mds: aleoMdsAsBigInts,
    roundConstants: aleoRoundConstantsAsBigInts
  };

  const aleoPoseidon = poseidon(aleoPoseidonOpts);
  // aleo always uses the same 9 inputs for the first hash, which always results in this first hash outpout.
  // We can just skip hashing the first round since we know the answer already.
  const firstHashOutput = [
    BigInt('5208930778286312600808795659554938611301275182092940462658648520079602102930'),
    BigInt('3994597320147350534724525457025712610108069861859758848892988202692173473766'),
    BigInt('5811491394154482048905836349496814770116289231209081615432099055744309986637'),
    BigInt('6453033494204920666140086001075222731779198093343026532418358638372117133089'),
    BigInt('6334450315946100385645225266750568899390082647901919844072282716171356792199'),
    BigInt('1534688567274028603821478027610936792462195219730276039032977528443314676504'),
    BigInt('5442838979203238763201664294025743588659204582886990828529890949134890976331'),
    BigInt('2786239965968296821488478838651772138841386999233021154548046837852479346774'),
    BigInt('2011433203564613444434680673362049409281410437476018311083897000100578507327')
  ]
  const secondElement = firstHashOutput[1];
  const thirdElement = firstHashOutput[2];
  const secondElementPlus = Fp.add(secondElement, encryptionDomain);
  const thirdElementPlus = Fp.add(thirdElement, recordViewKey);
  firstHashOutput[1] = secondElementPlus;
  firstHashOutput[2] = thirdElementPlus;
  const secondHashOutput = aleoPoseidon(firstHashOutput);
  return secondHashOutput[1];
}

function adjustScalarBytes(bytes: Uint8Array): Uint8Array {
  // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
  // set the three least significant bits of the first byte
  bytes[0] &= 248; // 0b1111_1000
  // and the most significant bit of the last to zero,
  bytes[31] &= 127; // 0b0111_1111
  // set the second most significant bit of the last byte to 1
  bytes[31] |= 64; // 0b0100_0000
  return bytes;
}

function uvRatio(u: bigint, v: bigint): { isValid: boolean; value: bigint } {
  // pray that this is not used
  throw new Error('Not implemented');
}

// printed out the Edwards_a coefficient
const aleoA = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040');
// printed out the edwards_d coefficient
const aleoD = BigInt('3021');
// https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L45
const aleoCofactor = BigInt(4);
// big int representations of https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L43
const aleoGeneratorX = BigInt('1540945439182663264862696551825005342995406165131907382295858612069623286213');
const aleoGeneratorY = BigInt('8003546896475222703853313610036801932325312921786952001586936882361378122196');

const customEdwards = (): CurveFn => {
  const aleoDef = {
    // Param: a
    a: aleoA,
    // Equal to -121665/121666 over finite field.
    // Negative number is P - number, and division is invert(number, P)
    d: aleoD,
    // Finite field 𝔽p over which we'll do calculations; 2n ** 255n - 19n
    Fp,
    // Subgroup order: how many points ed25519 has
    // 2n ** 252n + 27742317777372353535851937790883648493n;
    // not taken from aleo, don't know what this is
    n: aleoFieldOrder,
    // Cofactor
    h: aleoCofactor,
    // Base point (x, y) aka generator point
    Gx: aleoGeneratorX,
    Gy: aleoGeneratorY,
    hash: sha512,
    // pray we don't need this
    randomBytes: (randomBytes as any),
    // or this
    adjustScalarBytes,
    // dom2
    // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
    // Constant-time, u/√v
    uvRatio,
  } as const;

  return twistedEdwards(aleoDef)
}