import { ALEO_FIELD_MODULUS } from '../params/AleoConstants';
import { preComputedTShanks, tonelli_shanks } from './ShanksTonelli';

const testData = [
  [BigInt(4), BigInt(2)],
  [BigInt(9), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239038')],
  [BigInt(25), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239036')],
  [BigInt('9657672915538583998542678820329009'), BigInt('8444461749428370424248824938781546531375899335154063827935135182457535585544')]
];

describe('ShanksTonelli', () => {
    it.each(testData)('returns square root', (input: bigint, expected: bigint) => {
        const result = tonelli_shanks(input, ALEO_FIELD_MODULUS);
        expect(result).toBe(expected);
    });

    it.each(testData)('return square root (precomputed)', (input: bigint, expected: bigint) => {
        const result = preComputedTShanks(input);
        expect(result).toBe(expected);
    });
});
