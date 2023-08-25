import { BLS12_377ParamsWGSL } from "./wgsl/BLS12-377Params";

export const workgroupSize = 64;

export enum CurveType {
  BLS12_377 = 'BLS12_377',
  BN254 = 'BN254',
}

export const getCurveParamsWGSL = (curve: CurveType) => {
  switch (curve) {
    case CurveType.BLS12_377:
      return BLS12_377ParamsWGSL;
    case CurveType.BN254:
    throw new Error('BN254 not yet supported');
    default:
      throw new Error('Invalid curve type');
  }
};