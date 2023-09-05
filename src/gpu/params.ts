import { FIELD_MODULUS as BLS12_377_FIELD_MODULUS } from "../params/BLS12_377Constants";
import { FIELD_MODULUS as BN254_FIELD_MODULUS } from "../params/BN254Constants";
import { BLS12_377ParamsWGSL } from "./wgsl/BLS12-377Params";
import { BN254ParamsWGSL } from "./wgsl/BN254Params";

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