import { CurveType, getModulus } from '../gpu/curveSpecific';
import { tonelli_shanks } from './ShanksTonelli';

const testData = [
  { curve: CurveType.BLS12_377, input: BigInt(4), expected: BigInt(2) },
  { curve: CurveType.BLS12_377, input: BigInt(9), expected: BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239038')},
  { curve: CurveType.BLS12_377, input: BigInt(25), expected: BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239036')},
  { curve: CurveType.BLS12_377, input: BigInt('9657672915538583998542678820329009'), expected: BigInt('8444461749428370424248824938781546531375899335154063827935135182457535585544')},
  { curve: CurveType.BN254, input: BigInt("798273450982734509873540987349587349587"), expected: BigInt("9453787908876337015538631367818595462517703355588148573050277699114259557355") },
];

describe('ShanksTonelli', () => {
    it.each(testData)('returns square root', (args) => {
        const fieldModulus = getModulus(args.curve);
        const result = tonelli_shanks(args.input, fieldModulus);
        expect(result).toBe(args.expected);
    });
});
