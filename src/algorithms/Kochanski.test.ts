import { FIELD_MODULUS } from '../params/BLS12_377Constants';
import { Kochanski } from './Kochanski';

describe('Kochanski', () => {
    it.each([
        [BigInt(8), BigInt(7), BigInt(50), BigInt(6)],
        [BigInt(8), BigInt(7), BigInt(100), BigInt(56)],
        [BigInt(123456789), BigInt(987654321), BigInt(1000000007), BigInt(259106859)],
        [BigInt(100), BigInt(100), BigInt(100), BigInt(0)],
        [FIELD_MODULUS, BigInt(0), FIELD_MODULUS, BigInt(0)],
        [FIELD_MODULUS, BigInt(2), FIELD_MODULUS, BigInt(0)],
        [FIELD_MODULUS, FIELD_MODULUS, FIELD_MODULUS, BigInt(0)],
        [FIELD_MODULUS + BigInt(2), BigInt(2), FIELD_MODULUS, BigInt(4)],
    ])('properly does modulus multiplication', (a: bigint, b: bigint, modulus: bigint, expected: bigint) => {
        const result = Kochanski(a, b, modulus);
        expect(result).toEqual(expected);
    });
});