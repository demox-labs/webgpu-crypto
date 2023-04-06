// import { BLS, G1 } from "@celo/bls12377js";
import { CurveFn, twistedEdwards } from "@noble/curves/abstract/edwards";
import { sha512 } from '@noble/hashes/sha512';
import { poseidon, PoseidonOpts } from '@noble/curves/abstract/poseidon';
import { Field } from "@noble/curves/abstract/modular";
import { randomBytes } from "crypto";
import { aleoMdStrings, aleoRoundConstantStrings } from "../params/AleoMds";

// export const multiply = (nonce: string, scalar: string): string => {
//   const twistedEdwards = new eddsa('ed25519');
//   const fieldElement = new BN(nonce, 16, 'le');
//   const scalarElement = new BN(scalar, 16,'le');
//   const groupElementOdd = twistedEdwards.curve.pointFromX(fieldElement, true);
//   const result = groupElementOdd.mul(scalarElement);
//   return result.getX().toString();
// }

// export const convertFieldBytesToGroup = (fieldBytes: Uint8Array): G1 => {
//   const g1 = BLS.decompressG1(Buffer.from(fieldBytes));
//   // const g2 = BLS.decompressG2(Buffer.from(fieldBytes));
//   return g1;
// };

// export const convertXCoordinateToGroupElement = (xCoordinateField: string): curve.base.BasePoint  => {
//   const twistedEdwards = new eddsa('ed25519');
//   const xCoordinateBN = new BN(xCoordinateField, 16, 'le');
//   const groupElementOdd = twistedEdwards.curve.pointFromX(xCoordinateBN, true);
//   const groupElementEven = twistedEdwards.curve.pointFromX(xCoordinateBN, false);

//   const characteristic = twistedEdwards.curve.n;
//   const multipliedOddPoint = groupElementOdd.mul(characteristic);
//   // don't know how this works, don't care
//   if (multipliedOddPoint.isInfinity()) {
//     return groupElementOdd;
//   } else {
//     return groupElementEven;
//   }
// }


export const multiply = (nonce_x: string, nonce_y: string, scalar: string): { x: BigInt, y: BigInt } => {
  // Convert the scalar and point to BigInt
  const bigIntScalar = BigInt(scalar,);
  const bigIntPointX = BigInt(nonce_x);
  const bigIntPointY = BigInt(nonce_y);
  // Get the curve point in extended coordinates
  const aleoEdwards = customEdwards();
  const point = aleoEdwards.ExtendedPoint.fromAffine({ x: bigIntPointX, y: bigIntPointY });

  // Perform scalar multiplication
  // const result = point.multiply(bigIntScalar);
  const unsafeResult = point.multiplyUnsafe(bigIntScalar);

  // Convert the result to affine coordinates
  // const resultAffine = result.toAffine();
  // faster, but leaks info about the underlying data
  const unsafeResultAffine = unsafeResult.toAffine();

  return unsafeResultAffine;
}
// base field modulus https://docs.rs/ark-ed-on-bls12-377/latest/ark_ed_on_bls12_377/
export const aleoFieldOrder = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');
export const Fp = Field(aleoFieldOrder, undefined, true);

const encryptionDomain = BigInt('1187534166381405136191308758137566032926460981470575291457');
const poseidonDomain = BigInt('4470955116825994810352013241409');
const aleoMdsAsBigInts = aleoMdStrings.map(row => row.map(elm => Fp.create(BigInt(elm))));
const aleoRoundConstantsAsBigInts = aleoRoundConstantStrings.map(row => row.map(elm => Fp.create(BigInt(elm))));
// const poseidonField = Field(poseidonDomain, undefined, true);

export const poseidonHash = (recordViewKey: string, expectedResult: string): string => {
  const recordViewKeyBigInt = BigInt(recordViewKey);
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
  const thirdElementPlus = Fp.add(thirdElement, recordViewKeyBigInt);
  firstHashOutput[1] = secondElementPlus;
  firstHashOutput[2] = thirdElementPlus;
  const secondHashOutput = aleoPoseidon(firstHashOutput);
  return secondHashOutput[1].toString();
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
    n: BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989'),
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