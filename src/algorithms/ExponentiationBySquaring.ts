import { ALEO_FIELD_MODULUS } from "../params/AleoConstants";

export const Exponentiation = function exponentiation(base: bigint, exp: bigint, mod: bigint = ALEO_FIELD_MODULUS) {
    base %= mod;  // Update base if it is more than or equal to N
    let result = BigInt(1);

    while (exp > 0) {
        // If exp is odd, multiply base with result
        if (exp % BigInt(2) == BigInt(1)) {
            result = (result * base) % mod;
        }

        // exp must be even now, so we can safely divide it by 2
        exp = BigInt(exp) / BigInt(2);
        base = (base * base) % mod;
    }

    return result;
}