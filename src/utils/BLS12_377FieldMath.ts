import { CurveFn, ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { sha512 } from '@noble/hashes/sha512';
import { poseidon, PoseidonOpts } from '@noble/curves/abstract/poseidon';
import { Field, IField } from "@noble/curves/abstract/modular";
import { randomBytes } from "crypto";
import { aleoMdStrings, aleoRoundConstantStrings } from "../params/AleoPoseidonParams";
import { FIELD_MODULUS, EDWARDS_A, EDWARDS_D, SUBGROUP_CHARACTERISTIC } from "../params/BLS12_377Constants";
import { AffinePoint } from "@noble/curves/abstract/curve";

export class FieldMath {
  customEdwards: CurveFn;
  encryptionDomain: bigint;
  poseidonDomain: bigint;
  aleoMdsAsBigInts: bigint[][];
  aleoRoundConstantsAsBigInts: bigint[][];
  aleoFieldOrder: bigint;
  subgroupCharacteristic: bigint;
  aleoA: bigint;
  aleoD: bigint;
  Fp: IField<bigint>;

  constructor() {
    // printed out the Edwards_a coefficient
    this.aleoA = EDWARDS_A;
    // printed out the edwards_d coefficient
    this.aleoD = EDWARDS_D;
    this.encryptionDomain = BigInt('1187534166381405136191308758137566032926460981470575291457');
    this.poseidonDomain = BigInt('4470955116825994810352013241409');
    this.aleoFieldOrder = FIELD_MODULUS;
    this.Fp = Field(FIELD_MODULUS, undefined, false);
    this.aleoMdsAsBigInts = aleoMdStrings.map(row => row.map(elm => this.Fp.create(BigInt(elm))));
    this.aleoRoundConstantsAsBigInts = aleoRoundConstantStrings.map(row => row.map(elm => this.Fp.create(BigInt(elm))));
    this.customEdwards = this.instantiateCustomEdwards();
    this.subgroupCharacteristic = SUBGROUP_CHARACTERISTIC;
  }

  getPointFromX = (x_field: bigint): { x: bigint, y: bigint } => {
    // Compute y^2 = (a - x^2) / (1 + d * x^2) mod F (a = -1 for aleo (or 1 less than the field size))

    const xSquared = this.Fp.sqr(x_field);

    const numerator = this.Fp.sub(this.Fp.mul(this.aleoA, xSquared), BigInt(1));
    const denominator = this.Fp.sub(this.Fp.mul(this.aleoD, xSquared), BigInt(1));
    const ySquared = this.Fp.mul(numerator, this.Fp.inv(denominator));
    const y = this.Fp.sqrt(ySquared);

    const aleoEdwards = this.customEdwards;

    // Create the point object
    const topPoint = aleoEdwards.ExtendedPoint.fromAffine({ x: x_field, y: y });

    // modulus of the bls12-377 subgroup Scalar Field
    const multipliedTopPoint = topPoint.multiplyUnsafe(this.subgroupCharacteristic).toAffine();

    if (multipliedTopPoint.x === BigInt(0) && multipliedTopPoint.y === BigInt(1)) {
      return topPoint;
    } else {
      const negY = this.Fp.neg(y);
      return aleoEdwards.ExtendedPoint.fromAffine({ x: x_field, y: negY });
    }
  }

  createPoint = (x: bigint, y: bigint, t: bigint, z: bigint): ExtPointType => {
    return new this.customEdwards.ExtendedPoint(x, y, z, t);
  }

  addPoints = (points: ExtPointType[]): AffinePoint<bigint> => {
    // iterate through the points and add all of them up together
    const extPointResult = points.reduce((acc, point) => {return acc.add(point)}, this.customEdwards.ExtendedPoint.ZERO);
    return extPointResult.toAffine();
  }

  subtract = (x: bigint, y: bigint): bigint => {
    return this.Fp.sub(x, y);
  }

  multiply = (nonce_x: bigint, nonce_y: bigint, scalar: bigint): { x: bigint, y: bigint } => {
    // Get the curve point in extended coordinates
    const aleoEdwards = this.customEdwards;
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

  poseidonHash = (recordViewKey: bigint): bigint => {
    const aleoPoseidonOpts: PoseidonOpts = {
      Fp: this.Fp,
      t: 9,
      roundsFull: 8,
      roundsPartial: 31,
      sboxPower: 17,
      mds: this.aleoMdsAsBigInts,
      roundConstants: this.aleoRoundConstantsAsBigInts
    };
  
    const aleoPoseidon = poseidon(aleoPoseidonOpts);
    const firstHashInput = [BigInt(0), this.poseidonDomain, BigInt(2), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0), BigInt(0)];
    const firstHashOutput = aleoPoseidon(firstHashInput);
    const secondElement = firstHashOutput[1];
    const thirdElement = firstHashOutput[2];
    const secondElementPlus = this.Fp.add(secondElement, this.encryptionDomain);
    const thirdElementPlus = this.Fp.add(thirdElement, recordViewKey);
    firstHashOutput[1] = secondElementPlus;
    firstHashOutput[2] = thirdElementPlus;
    const secondHashOutput = aleoPoseidon(firstHashOutput);
    return secondHashOutput[1];
  }
  
  poseidonHashFast = (recordViewKey: bigint): bigint => {
    // const expectedResultBigInt = BigInt(expectedResult);
    const aleoPoseidonOpts: PoseidonOpts = {
      Fp: this.Fp,
      t: 9,
      roundsFull: 8,
      roundsPartial: 31,
      sboxPower: 17,
      mds: this.aleoMdsAsBigInts,
      roundConstants: this.aleoRoundConstantsAsBigInts
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
    ];
    const secondElement = firstHashOutput[1];
    const thirdElement = firstHashOutput[2];
    // just calculate this ahead of time, because the encryption domain is constant
    const secondElementPlus = this.Fp.add(secondElement, this.encryptionDomain);
    const thirdElementPlus = this.Fp.add(thirdElement, recordViewKey);
    firstHashOutput[1] = secondElementPlus;
    firstHashOutput[2] = thirdElementPlus;
    const secondHashOutput = aleoPoseidon(firstHashOutput);
    return secondHashOutput[1];
  }
  
  adjustScalarBytes(bytes: Uint8Array): Uint8Array {
    // Section 5: For X25519, in order to decode 32 random bytes as an integer scalar,
    // set the three least significant bits of the first byte
    bytes[0] &= 248; // 0b1111_1000
    // and the most significant bit of the last to zero,
    bytes[31] &= 127; // 0b0111_1111
    // set the second most significant bit of the last byte to 1
    bytes[31] |= 64; // 0b0100_0000
    return bytes;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  uvRatio(u: bigint, v: bigint): { isValid: boolean; value: bigint } {
    // pray that this is not used
    throw new Error('Not implemented');
  }
  
  instantiateCustomEdwards = (): CurveFn => {
    // https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L45
    const aleoCofactor = BigInt(4);
    // big int representations of https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L43
    const aleoGeneratorX = BigInt('1540945439182663264862696551825005342995406165131907382295858612069623286213');
    const aleoGeneratorY = BigInt('8003546896475222703853313610036801932325312921786952001586936882361378122196');
    const aleoDef = {
      // Param: a
      a: this.aleoA,
      // Equal to -121665/121666 over finite field.
      // Negative number is P - number, and division is invert(number, P)
      d: this.aleoD,
      // Finite field 𝔽p over which we'll do calculations; 2n ** 255n - 19n
      Fp: this.Fp,
      // Subgroup order: how many points ed25519 has
      // 2n ** 252n + 27742317777372353535851937790883648493n;
      // not taken from aleo, don't know what this is
      n: FIELD_MODULUS,
      // Cofactor
      h: aleoCofactor,
      // Base point (x, y) aka generator point
      Gx: aleoGeneratorX,
      Gy: aleoGeneratorY,
      hash: sha512,
      // pray we don't need this
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      randomBytes: (randomBytes as any),
      // or this
      adjustScalarBytes: this.adjustScalarBytes,
      // dom2
      // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
      // Constant-time, u/√v
      uvRatio: this.uvRatio,
    } as const;
  
    return twistedEdwards(aleoDef)
  }
}




// const poseidonField = Field(poseidonDomain, undefined, true);