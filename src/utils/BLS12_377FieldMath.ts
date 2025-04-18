import { AffinePoint } from "@noble/curves/abstract/curve";
import { CurveFn, ExtPointType, twistedEdwards } from "@noble/curves/abstract/edwards";
import { Field, FpSqrtEven, IField } from "@noble/curves/abstract/modular";
import { grainGenConstants, poseidon, PoseidonOpts, poseidonSponge, type PoseidonBasicOpts, type PoseidonSpongeOpts } from '@noble/curves/abstract/poseidon';
import { bitMask, bytesToNumberLE, utf8ToBytes } from '@noble/curves/abstract/utils'; // Keep utils
import { sha512 } from '@noble/hashes/sha512';
import { randomBytes } from '@noble/hashes/utils';
import { aleoMdStrings, aleoRoundConstantStrings } from "../params/AleoPoseidonParams";
import { EDWARDS_A, EDWARDS_D, FIELD_MODULUS, SUBGROUP_CHARACTERISTIC } from "../params/BLS12_377Constants";

// same as aleo sdk
export type PoseidonType = PoseidonSpongeOpts & {
  hashMany: (input: bigint[], count: number) => bigint[],
  hash: (input: bigint[]) => bigint;
  hashScalar: (input: bigint[]) => bigint;
  // NOTE: we return point here instead of just X coordinate in case it will be re-used as Point
  hashGroup: (input: bigint[]) => ExtPointType;
}

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
  scalarField: IField<bigint>;
  poseidon2: PoseidonType;
  poseidon4: PoseidonType;
  poseidon8: PoseidonType;

  constructor() {
    // printed out the Edwards_a coefficient
    this.aleoA = EDWARDS_A;
    // printed out the edwards_d coefficient
    this.aleoD = EDWARDS_D;
    this.encryptionDomain = BigInt('1187534166381405136191308758137566032926460981470575291457');
    this.poseidonDomain = BigInt('4470955116825994810352013241409');
    this.aleoFieldOrder = FIELD_MODULUS;
    this.Fp = Field(FIELD_MODULUS, undefined, false);
    this.scalarField = Field(SUBGROUP_CHARACTERISTIC, undefined, false);
    // NOTE: these are not needed anymore, we build them in runtime for poseidon2/4/8. Left here for reference.
    this.aleoMdsAsBigInts = aleoMdStrings.map(row => row.map(elm => this.Fp.create(BigInt(elm))));
    this.aleoRoundConstantsAsBigInts = aleoRoundConstantStrings.map(row => row.map(elm => this.Fp.create(BigInt(elm))));
    this.customEdwards = this.instantiateCustomEdwards();
    this.subgroupCharacteristic = SUBGROUP_CHARACTERISTIC;
    // Poseidon
    this.poseidon2 = this.aleoPoseidon(2, 'AleoPoseidon2');
    this.poseidon4 = this.aleoPoseidon(4, 'AleoPoseidon4');
    this.poseidon8 = this.aleoPoseidon(8, 'AleoPoseidon8');

  }

  getPointFromX = (x_field: bigint): ExtPointType => {
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
    // NOTE: I have no idea what original code tried to do, but this is multiply by zero.
    const multipliedTopPoint = topPoint/*.multiplyUnsafe(this.subgroupCharacteristic)*/.toAffine();

    if (multipliedTopPoint.x === BigInt(0) && multipliedTopPoint.y === BigInt(1)) {
      return topPoint;
    } else {
      // NOTE: always negate y if point is not zero?!
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

  instantiateCustomEdwards = (): CurveFn => {
    // https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L45
    const aleoCofactor = BigInt(4);
    // big int representations of https://github.com/AleoHQ/snarkVM/blob/testnet3/curves/src/edwards_bls12/parameters.rs#L43
    const aleoGeneratorX = BigInt('1540945439182663264862696551825005342995406165131907382295858612069623286213');
    const aleoGeneratorY = BigInt('8003546896475222703853313610036801932325312921786952001586936882361378122196');
    // NOTE: this is not bls12-377, but additional curve which has Fp.ORDER = bls12_377.Fr.ORDER, same
    // as jubjub for bls12-381 and babyjubjub for bn254. This curve required because inside pairings/circuits
    // we can do very fast arithmetic in bls12_377.Fr field (since circuit works on top of it).
    const aleoDef = {
      // Param: a
      a: this.aleoA,
      // Param: D
      d: this.aleoD,
      // Finite field 𝔽p over which we'll do calculations;
      Fp: this.Fp,
      // Subgroup order: how many points on curve
      n: this.scalarField.ORDER,
      // Cofactor
      h: aleoCofactor,
      // Base point (x, y) aka generator point
      Gx: aleoGeneratorX,
      Gy: aleoGeneratorY,
      hash: sha512,
      randomBytes: randomBytes,
    } as const;

    return twistedEdwards(aleoDef);
  }
  // Additional functions for poseidon
  domainSeparator(domain: string) {
    if (domain.length > this.Fp.BYTES)
      throw new Error('domainSeparator: cannot be bigger than field');
    return this.Fp.create(bytesToNumberLE(utf8ToBytes(domain)));
  }
  private map_to_curve_elligator2 = (u: bigint) => {
    const { Fp } = this;
    const { CURVE } = this.customEdwards;
    if (Fp.is0(u)) throw new Error('Elligator2 input must be non-zero');
    // Montgomery constants from twisted Edwards
    const a_plus_d = Fp.add(CURVE.a, CURVE.d);
    const a_minus_d = Fp.sub(CURVE.a, CURVE.d);
    const inv_a_minus_d = Fp.inv(a_minus_d);
    const BA = Fp.mul(BigInt(2), Fp.mul(a_plus_d, inv_a_minus_d)); // A = 2(a + d) / (a - d)
    const BM = Fp.mul(BigInt(4), inv_a_minus_d); // B = 4 / (a - d)
    // Weierstrass constants A = A/B, B = 1/B²
    const invMontB = Fp.inv(BM);
    const WA = Fp.mul(BA, invMontB); // A / B
    const WB = Fp.sqr(invMontB); // 1 / B^2
    // Elligator
    const ur2 = Fp.mul(CURVE.d, Fp.sqr(u));
    const v = Fp.mul(Fp.neg(WA), Fp.inv(Fp.add(Fp.ONE, ur2))); // v = -A / (1 + ur^2).
    if (Fp.is0(v)) throw new Error('Elligator2: v == 0');
    const v2 = Fp.sqr(v);
    const v3 = Fp.mul(v2, v);
    const e = Fp.add(Fp.add(v3, Fp.mul(WA, v2)), Fp.mul(WB, v)); // v^3 + Av^2 + Bv
    const legendre = Fp.pow(e, (Fp.ORDER - BigInt(1)) >> BigInt(1));
    if (Fp.is0(legendre)) throw new Error('Elligator2: legendre == 0'); // -> y=0 -> fails check
    const isQR = legendre === Fp.ONE;
    // x = ev - ((1 - e) * A/2)
    const x = isQR ? v : Fp.sub(Fp.neg(v), WA);
    if (Fp.is0(x)) throw new Error('Elligator2: x == 0');
    // y = -e * sqrt(x^3 + ax^2 + bx)
    const x2 = Fp.sqr(x);
    const x3 = Fp.mul(x2, x);
    const rhs = Fp.add(Fp.add(x3, Fp.mul(WA, x2)), Fp.mul(WB, x));
    const sqrt = FpSqrtEven(Fp, rhs);
    const y = isQR ? Fp.neg(sqrt) : sqrt;
    if (Fp.sqr(y) !== rhs) throw new Error('Elligator2: y² != rhs');
    if (Fp.is0(y)) throw new Error('Elligator2: y == 0');
    // Convert Weierstrass (x, y) to Montgomery (u, v)
    const uM = Fp.mul(x, BM); // u = x * B
    const vM = Fp.mul(y, BM); // v = y * B
    // Check if montgomery is on curve
    const uM2 = Fp.sqr(uM);
    const uM3 = Fp.mul(uM2, uM);
    // B*v^2 != u^3 + A*u^2 + u
    if (Fp.mul(BM, Fp.sqr(vM)) !== Fp.add(Fp.add(uM3, Fp.mul(BA, uM2)), uM))
      throw new Error('Elligator2 failed: Montgomery point check');
    // Convert Montgomery (u, v) to twisted Edwards (x, y)
    const xE = Fp.mul(uM, Fp.inv(vM)); // x = u / v
    const yE = Fp.mul(Fp.sub(uM, Fp.ONE), Fp.inv(Fp.add(uM, Fp.ONE))); // y = (u - 1)/(u + 1)
    return { x: xE, y: yE };
  };
  pointToX(p: any) {
    return p.toAffine().x;
  }
  private aleoPoseidon(rate: number, domain: string): PoseidonType {
    const capacity = 1; // fixed
    const opts: PoseidonBasicOpts = {
      Fp: this.Fp,
      t: rate + capacity,
      roundsFull: 8,
      roundsPartial: 31,
    };
    const { mds, roundConstants } = grainGenConstants(opts);
    const res: PoseidonSpongeOpts = {
      ...opts,
      rate,
      capacity,
      sboxPower: 17,
      mds,
      roundConstants,
    };
    const domainSeparator = this.domainSeparator(domain);
    const getSponge = poseidonSponge(res);
    const hashMany = (input: bigint[], count: number): bigint[] => {
      const h = getSponge();
      if (!Array.isArray(input)) throw new Error('hashMany: input must be an array.');
      // DOMAIN || LENGTH || [0; RATE-2] || INPUT
      // NOTE: we cannot precompute sponge and use .clone to skip first round because input.length maybe different!
      const preimage: bigint[] = [];
      preimage.push(domainSeparator);
      preimage.push(this.Fp.create(BigInt(input.length)));
      for (let i = 0; i < h.rate - 2; i++) preimage.push(this.Fp.ZERO);
      preimage.push(...input);
      h.absorb(preimage);
      return h.squeeze(count);
    };
    const hash = (input: bigint[]): bigint => {
      if (!Array.isArray(input)) throw new Error('hash input must be an array.');
      return hashMany(input, 1)[0];
    };
    const hashScalar = (input: bigint[]) => {
      return hash(input) & bitMask(this.scalarField.BITS - 1);
    };
    const Point = this.customEdwards.ExtendedPoint;
    const mapToCurve = this.map_to_curve_elligator2;
    return {
      ...res, // info/constants for tests/debug
      hashMany,
      hash,
      hashScalar,
      // NOTE: we return point here instead of just X coordinate in case it will be re-used as Point
      hashGroup(input: bigint[]) {
        // Same as hashToCurve, but with hashToMany instead of hash_to_field
        const u = hashMany(input, 2);
        const u0 = Point.fromAffine(mapToCurve(u[0]));
        const u1 = Point.fromAffine(mapToCurve(u[1]));
        const P = u0.add(u1).clearCofactor();
        P.assertValidity();
        return P;
      },
    };
  }
}




// const poseidonField = Field(poseidonDomain, undefined, true);