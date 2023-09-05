import { CurveType, getModulus } from '../gpu/params';
import { preComputedTShanks, tonelli_shanks } from './ShanksTonelli';

const testData = [
  { curve: CurveType.BLS12_377, input: BigInt(4), expected: BigInt(2) },
  { curve: CurveType.BLS12_377, input: BigInt(9), expected: BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239038')},
  { curve: CurveType.BLS12_377, input: BigInt(25), expected: BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239036')},
  { curve: CurveType.BLS12_377, input: BigInt('9657672915538583998542678820329009'), expected: BigInt('8444461749428370424248824938781546531375899335154063827935135182457535585544')},
  { curve: CurveType.BN254, input: BigInt(4), expected: BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495615') },
];

describe('ShanksTonelli', () => {
    it.each(testData)('returns square root', (args) => {
        const fieldModulus = getModulus(args.curve);
        const result = tonelli_shanks(args.input, fieldModulus);
        expect(result).toBe(args.expected);
    });

    it.each(testData)('return square root (precomputed)', (args) => {
        const result = preComputedTShanks(args.input, args.curve);
        expect(result).toBe(args.expected);
    });
});
