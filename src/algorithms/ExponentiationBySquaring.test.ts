import { Exponentiation } from './ExponentiationBySquaring';
import { ALEO_FIELD_MODULUS } from '../params/AleoConstants';

describe('Exponentiation', () => {
    it.each([
        [BigInt(2), BigInt(3), BigInt(50), BigInt(8)]
    ])('properly does modulus multiplication', (a: bigint, b: bigint, modulus: bigint, expected: bigint) => {
        const result = Exponentiation(a, b, modulus);
        expect(result).toEqual(expected);
    });
});