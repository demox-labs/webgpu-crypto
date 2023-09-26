import { FIELD_MODULUS as BLS12_377_FIELD_MODULUS } from "../params/BLS12_377Constants";
import { FQ_FIELD_MODULUS as BN254_FIELD_MODULUS } from "../params/BN254Constants";
import { BLS12_377ParamsWGSL } from "./wgsl/BLS12-377Params";
import { BN254ParamsWGSL } from "./wgsl/BN254Params";
import { BN254CurveBaseWGSL } from "./wgsl/BN254CurveBaseWGSL";
import { BLS12_377CurveBaseWGSL } from "./wgsl/BLS12-377CurveBaseWGSL";
import { ExtPointType } from "@noble/curves/abstract/edwards";
import { FieldMath } from "../utils/BLS12_377FieldMath";
import { bigIntToU32Array } from "./utils";
import { bn254 } from '@noble/curves/bn';
import { ProjPointType } from "@noble/curves/abstract/weierstrass";

export const workgroupSize = 64;

export enum CurveType {
  BLS12_377 = 'BLS12_377',
  BN254 = 'BN254',
}

export const getModulus = (curve: CurveType) => {
  switch (curve) {
    case CurveType.BLS12_377:
      return BLS12_377_FIELD_MODULUS;
    case CurveType.BN254:
      return BN254_FIELD_MODULUS;
    default:
      throw new Error('Invalid curve type');
  }
};

export const getCurveParamsWGSL = (curve: CurveType) => {
  switch (curve) {
    case CurveType.BLS12_377:
      return BLS12_377ParamsWGSL;
    case CurveType.BN254:
      return BN254ParamsWGSL;
    default:
      throw new Error('Invalid curve type');
  }
};

export const getCurveBaseFunctionsWGSL = (curve: CurveType) => {
  switch (curve) {
    case CurveType.BLS12_377:
      return BLS12_377CurveBaseWGSL
    case CurveType.BN254:
      return BN254CurveBaseWGSL;
    default:
      throw new Error('Invalid curve type');
  }
};

export const sumExtPoints = (curve: CurveType, flattenedPoints: bigint[]) => {
  switch (curve) {
    case CurveType.BLS12_377:
      return sumExtPointsBLS12_377(flattenedPoints);
    case CurveType.BN254:
      return sumExtPointsBN254(flattenedPoints);
    default:
      throw new Error('Invalid curve type');
  }
};

const sumExtPointsBLS12_377 = (flattenedPoints: bigint[]) => {
  const fieldMath = new FieldMath();
  const pointArray: ExtPointType[] = [];

  // convert big int result to extended points
  for (let i = 0; i < flattenedPoints.length; i += 4) {
    const x = flattenedPoints[i];
    const y = flattenedPoints[i + 1];
    const t = flattenedPoints[i + 2];
    const z = flattenedPoints[i + 3];
    const point = fieldMath.createPoint(x, y, t, z);
    pointArray.push(point);
  }
  const affineResult = fieldMath.addPoints(pointArray);
  const u32XCoord = bigIntToU32Array(affineResult.x);
  return u32XCoord;
};

const sumExtPointsBN254 = (flattenedPoints: bigint[]) => {
  const pointArray: ProjPointType<bigint>[] = [];
  const curve = bn254;
  // convert big int result to extended points
  for (let i = 0; i < flattenedPoints.length; i += 4) {
    const x = flattenedPoints[i];
    const y = flattenedPoints[i + 1];
    const z = flattenedPoints[i + 3];
    const point = new curve.ProjectivePoint(x, y, z);
    pointArray.push(point);
  }
  const extResult = pointArray.reduce((acc, point) => {return bn254AddPoints(acc, point)}, curve.ProjectivePoint.ZERO);
  const z = extResult.pz;
  const iz = curve.CURVE.Fp.inv(z);
  const iz2 = curve.CURVE.Fp.sqr(iz);
  const actualResult = curve.CURVE.Fp.mul(extResult.px, iz2);
  // const affineResult = extResult.toAffine();
  const u32XCoord = bigIntToU32Array(actualResult);
  return u32XCoord;
};

export const bn254AddPoints = (p1: ProjPointType<bigint>, p2: ProjPointType<bigint>) => {
  const fp = bn254.CURVE.Fp;
  if (p1.px === BigInt(0) && p1.py === BigInt(1) && p1.pz === BigInt(0)) {
    return p2;
  }
  if (p2.px === BigInt(0) && p2.py === BigInt(1) && p2.pz === BigInt(0)) {
    return p1;
  }
  let z1z1 = fp.mul(p1.pz, p1.pz);
  const z2z2 = fp.mul(p2.pz, p2.pz);
  let s2 = fp.mul(z1z1, p1.pz);
  let u2 = fp.mul(z1z1, p2.px);
  s2 = fp.mul(s2, p2.py);
  let u1 = fp.mul(z2z2, p1.px);
  let s1 = fp.mul(z2z2, p2.pz);
  s1 = fp.mul(s1, p1.py);
  const s_sub = fp.sub(s2, s1);
  const f = fp.add(s_sub, s_sub);
  if (f === BigInt(0)) {
    return bn254DoublePoint(p1);
  }
  const h = fp.sub(u2, u1);
  let i = fp.add(h, h);
  i = fp.mul(i, i);
  let j = fp.mul(h, i);
  u1 = fp.mul(u1, i);
  u2 = fp.add(u1, u1);
  u2 = fp.add(u2, j);
  let x_result = fp.mul(f, f);
  x_result = fp.sub(x_result, u2);
  j = fp.mul(j, s1);
  j = fp.add(j, j);
  let y_result = fp.sub(u1, x_result);
  y_result = fp.mul(f, y_result);
  y_result = fp.sub(y_result, j);
  let z_result = fp.add(p1.pz, p2.pz);
  z1z1 = fp.add(z1z1, z2z2);
  z_result = fp.mul(z_result, z_result);
  z_result = fp.sub(z_result, z1z1);
  z_result = fp.mul(z_result, h);
  return new bn254.ProjectivePoint(x_result, y_result, z_result);
};

export const bn254PointScalar = (p: ProjPointType<bigint>, scalar: bigint) => {
  let result = bn254.ProjectivePoint.ZERO;
  let temp = p;
  let scalar_iter = scalar;
  while (scalar_iter !== 0n) {
    if ((scalar_iter & 1n) === 1n) {
      result = bn254AddPoints(result, temp);
    }
    temp = bn254DoublePoint(temp);
    scalar_iter = scalar_iter >> 1n;
  }
};

const bn254DoublePoint = (p: ProjPointType<bigint>) => {
  const fp = bn254.CURVE.Fp;
  let T0 = fp.mul(p.px, p.px);
  let T1 = fp.mul(p.py, p.py);
  let T2 = fp.mul(T1, T1);
  T1 = fp.add(p.px, T1);
  T1 = fp.mul(T1, T1);
  let T3 = fp.add(T0, T2);
  T1 = fp.sub(T1, T3);
  T1 = fp.add(T1, T1);
  T3 = fp.add(T0, T0);
  T3 = fp.add(T3, T0);
  let z_result = fp.add(p.pz, p.pz);
  z_result = fp.mul(z_result, p.py);
  T0 = fp.add(T1, T1);
  let x_result = fp.mul(T3, T3);
  x_result = fp.sub(x_result, T0);
  T2 = fp.add(T2, T2);
  T2 = fp.add(T2, T2);
  T2 = fp.add(T2, T2);
  let y_result = fp.sub(T1, x_result);
  y_result = fp.mul(T3, y_result);
  y_result = fp.sub(y_result, T2);
  return new bn254.ProjectivePoint(x_result, y_result, z_result);
};