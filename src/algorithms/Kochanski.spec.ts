import { Kochanski } from './Kochanski';

const ALEO_FIELD_ORDER = BigInt(8444461749428370424248824938781546531375899335154063827935233455917409239041);

describe('Kochanski', () => {
    it.each([
        [BigInt(8), BigInt(7), BigInt(50), BigInt(6)],
        [BigInt(8), BigInt(7), BigInt(100), BigInt(56)],
        [BigInt(123456789), BigInt(987654321), BigInt(1000000007), BigInt(259106859)],
        [BigInt(100), BigInt(100), BigInt(100), BigInt(0)],
        [ALEO_FIELD_ORDER, BigInt(0), ALEO_FIELD_ORDER, BigInt(0)],
        [ALEO_FIELD_ORDER, BigInt(2), ALEO_FIELD_ORDER, BigInt(0)],
        [ALEO_FIELD_ORDER, ALEO_FIELD_ORDER, ALEO_FIELD_ORDER, BigInt(0)],
        [ALEO_FIELD_ORDER + BigInt(2), BigInt(2), ALEO_FIELD_ORDER, BigInt(4)],
    ])('properly does modulus multiplication', (a: bigint, b: bigint, modulus: bigint, expected: bigint) => {
        const result = Kochanski(a, b, modulus);
        expect(result).toEqual(expected);
    });
});