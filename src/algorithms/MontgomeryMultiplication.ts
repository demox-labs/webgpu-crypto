import { uint32ArrayToBigInt } from "../gpu/utils";
import { 
  FIELD_MODULUS as N, 
  MONTGOMERY_RADIX as R, 
  MONTGOMERY_RINVERSE as R_PRIME, 
  FIELD_MODULUS_NPRIME as N_PRIME
} from "../params/BLS12_377Constants";

import { Kochanski } from "./Kochanski";

const Rsq = BigInt('508595941311779472113692600146818027278633330499214071737745792929336755579'); // R^2 mod N. Used to transform out of Mont form.

/**
 * Computes a x b mod AleoFieldModulus using Montgomery multiplication.
 * Note that converting to and from Montgomery form are the most expensive operations as they require modulo AleoFieldModulus.
 * 
 * @param a A bigint
 * @param b Another bigint
 * @returns a * b mod AleoFieldModulus
 */
export const Montgomery = (a: bigint, b: bigint) => {
  // Convert to montgomery form. Can rely on Montgomery_redc for this utilizing the fact that mont_redc(x * (R^2 mod N)) = x * R mod N.
  // let a_mont = (a * R) % N;
  // let b_mont = (b * R) % N;
  let a_mont = Montgomery_redc(a * Rsq); // Note that if a * Rsq is a 512 bit number. u256 wrapping makes this incorrect.
  let b_mont = Montgomery_redc(b * Rsq);

  // Do montgomery multiplication:
  let t = a_mont * b_mont;
  let u = Montgomery_redc(t);

  // Convert out back out of montgomery form. Takes one more montgomery reduction.
  return Montgomery_redc(u);
};

export const Montgomery_K = (a: bigint, b: bigint) => {
  // convert to montgomery form. Can rely on Montgomery_redc for this utilizing the fact that mont_redc(x * (R^2 mod N)) = x * R mod N.
  let a_mont = Kochanski(a, R, N);
  let b_mont = Kochanski(b, R, N);

  // Do montgomery multiplication:
  let t = a_mont * b_mont;
  let u = Montgomery_redc(t);

  // Convert out back out of montgomery form. Also slow. Could use Kochanski for this step.
  return Montgomery_redc(u);
};

/**
 * https://en.wikipedia.org/wiki/Montgomery_modular_multiplication
 * FUTURE: See Montgomery arithmetic on multiprecision integers section for a reduction utilizing limbs.
 * Note that this would need a rechoosing of R from R = 2^253 to R = 2^256.
 * 
 * REDC is a way to efficiently do tR' mod N, where R' is the inverse of R mod N and t is the product of 2 montgomery numbers.
 * 
 * From Wikipedia:
 * function REDC is
    input: Integers R and N with gcd(R, N) = 1,
           Integer N′ in [0, R − 1] such that NN′ ≡ −1 mod R,
           Integer T in the range [0, RN − 1].
    output: Integer S in the range [0, N − 1] such that S ≡ TR−1 mod N

    m ← ((T mod R)N′) mod R
    t ← (T + mN) / R
    if t ≥ N then
        return t − N
    else
        return t
    end if
end function
 */

const Montgomery_redc = (t: bigint) => {
  const m = (t * N_PRIME) % R; // Note than this mod R is fast as you can right shift by 256 bits to get the remainder
  const newT = (t + (m * N)) >> BigInt(256); // divide by R
  if (newT >= N) {
    return newT - N;
  }
  else {
    return newT;
  }
}

/**
 * Given 2 number a and b, returns the two numbers x and y such that ax + by = gcd(a, b). (Bezout's identity)
 * 
 * @param a 
 * @param b 
 * @returns [gcd, x, y]
 */
function extendedGCD(a: bigint, b: bigint): [bigint, bigint, bigint] {
  if (a === BigInt(0)) {
    return [b, BigInt(0), BigInt(1)];
  } else {
    const [g, x, y] = extendedGCD(b % a, a);
    return [g, y - (b / a) * x, x];
  }
}

// Used for finding R' such that RR' mod N = 1
function modInv(a: bigint, m: bigint): bigint {
  const [g, x, _] = extendedGCD(a, m);
  if (g !== BigInt(1)) {
    throw new Error('Modular inverse does not exist');
  } else {
    return (x % m + m) % m;  // Ensure the result is positive
  }
}

const FIELD_MODULUS_AS_U32_ARRAY: Uint32Array = new Uint32Array([
  313222494,
  2586617174,
  1622428958,
  1547153409,
  1504343806,
  3489660929,
  168919040,
  1
]);

/**
 * Wikipedia version. Can't get working :/
 * 
 * function MultiPrecisionREDC is
    Input: Integer N with gcd(B, N) = 1, stored as an array of p words,
           Integer R = Br,     --thus, r = logB R
           Integer N′ in [0, B − 1] such that NN′ ≡ −1 (mod B),
           Integer T in the range 0 ≤ T < RN, stored as an array of r + p words.

    Output: Integer S in [0, N − 1] such that TR−1 ≡ S (mod N), stored as an array of p words.

    Set T[r + p] = 0  (extra carry word)
    for 0 ≤ i < r do
        --loop1- Make T divisible by Bi+1

        c ← 0
        m ← T[i] ⋅ N′ mod B
        for 0 ≤ j < p do
            --loop2- Add the low word of m ⋅ N[j] and the carry from earlier, and find the new carry

            x ← T[i + j] + m ⋅ N[j] + c
            T[i + j] ← x mod B
            c ← ⌊x / B⌋
        end for
        for p ≤ j ≤ r + p − i do
            --loop3- Continue carrying

            x ← T[i + j] + c
            T[i + j] ← x mod B
            c ← ⌊x / B⌋
        end for
    end for

    for 0 ≤ i < p do
        S[i] ← T[i + r]
    end for

    if S ≥ N then
        return S − N
    else
        return S
    end if
end function
 */
export const Montgomery_MultiPrecisionREDC = (t: Uint32Array): Uint32Array => {
  console.log('t array: ', t);
  console.log('t: ', uint32ArrayToBigInt(t, false));
  const r = 8; // We use 8 limbs for our u256s
  const p = FIELD_MODULUS_AS_U32_ARRAY.length;
  const B = 2**32;
  const nBPrime = 4294967295; // N*nBPrime mod B = -1
  const NlittleEndian = FIELD_MODULUS_AS_U32_ARRAY.slice().reverse();
  let s = new Uint32Array(p).fill(0);
  // let newT = new Uint32Array(p + r).fill(0);
  t[r + p] = 0; // Extra carry word
  console.log('t array: ', t);
  for (let i = 0; i < r; i++) {
    let c = 0;
    let m = (t[i] * nBPrime) % B; // m = T[i] * N' mod B
    for (let j = 0; j < p; j++) {
      let x = BigInt(t[i + j]) + BigInt(m * NlittleEndian[j]) + BigInt(c);
      t[i + j] = Number(x % BigInt(B));
      c = Math.floor(Number(x  / BigInt(B)));
    }
    for (let j = p; j <= r + p - i; j++) {
      let x = BigInt(t[i + j]) + BigInt(c);
      t[i + j] = Number(x % BigInt(B));
      c = Math.floor(Number(x / BigInt(B)));
    }
  }

  for (let i = 0; i < p; i++) {
    s[i] = t[i + r];
  }
  console.log('t array: ', t);
  console.log('s array: ', s);
  console.log('S:', uint32ArrayToBigInt(s, false));

  let compare = compareUint32Arrays(s, NlittleEndian);
  if (compare || compare == 0) {
    return subtractUint32Arrays(s, NlittleEndian);
  }
  else {
    return s;
  }
}

/**
 * Algorithm 14.36 from Handbook of Applied Cryptography
 * <http://cacr.uwaterloo.ca/hac/about/chap14.pdf>
 * 
 * INPUT: integers m = (mn−1 ··· m1m0)b, x = (xn−1 ··· x1x0)b, y = (yn−1 ··· y1y0)b
 * with 0 ≤ x, y < m, R = bn with gcd(m, b)=1, and m0 = −m−1 mod b.
 * OUTPUT: xyR−1 mod m.
 * 1. A←0. (Notation: A = (anan−1 ··· a1a0)b.)
 * 2. For i from 0 to (n − 1) do the following:
 * 2.1 ui←(a0 + xiy0)m0 mod b.
 * 2.2 A←(A + xiy + uim)/b.
 * 3. If A ≥ m the
 */
export const MontgomeryMultiplication = (x: Uint32Array, y: Uint32Array): Uint32Array => {
  const m = FIELD_MODULUS_AS_U32_ARRAY;
  const m0 = 4294967295; // m * m0 mod b = -1
  let A = new Uint32Array(1).fill(0);
}

function addUint32Arrays(a: Uint32Array, b: Uint32Array, isBigEndian = false): Uint32Array {
  const maxLength = Math.max(a.length, b.length);
  const result = new Uint32Array(maxLength);
  let carry = 0;

  const loopStart = isBigEndian ? maxLength - 1 : 0;
  const loopEnd = isBigEndian ? -1 : maxLength;
  const loopStep = isBigEndian ? -1 : 1;

  for (let i = loopStart; isBigEndian ? i > loopEnd : i < loopEnd; i += loopStep) {
    const sum = (a[i] || 0) + (b[i] || 0) + carry;
    result[i] = sum >>> 0;
    carry = sum < a[i] || sum < b[i] ? 1 : 0;
  }

  if (carry > 0) {
    const extendedResult = new Uint32Array(maxLength + 1);
    extendedResult.set(result);
    if (isBigEndian) {
      extendedResult[maxLength] = carry;
    } else {
      extendedResult[0] = carry;
    }
    return extendedResult;
  }

  return result;
}

function subtractUint32Arrays(a: Uint32Array, b: Uint32Array, isBigEndian = false): Uint32Array {
  const maxLength = Math.max(a.length, b.length);
  const result = new Uint32Array(maxLength);
  let borrow = 0;

  const loopStart = isBigEndian ? maxLength - 1 : 0;
  const loopEnd = isBigEndian ? -1 : maxLength;
  const loopStep = isBigEndian ? -1 : 1;

  for (let i = loopStart; isBigEndian ? i > loopEnd : i < loopEnd; i += loopStep) {
    const diff = (a[i] || 0) - (b[i] || 0) - borrow;
    result[i] = diff >>> 0;
    borrow = diff < 0 ? 1 : 0;
  }

  let lastIndex = isBigEndian ? maxLength - 1 : 0;
  while (lastIndex >= 0 && result[lastIndex] === 0) {
    lastIndex -= loopStep;
  }

  return result.subarray(isBigEndian ? lastIndex + 1 : 0, isBigEndian ? undefined : lastIndex + 1);
}

// Compares two Uint32Arrays of arbitrary length.
// Returns -1 if a < b, 1 if a > b, and 0 if a == b.
// Takes into account the specified endianness.
function compareUint32Arrays(a: Uint32Array, b: Uint32Array, isBigEndian = false): number {
  const maxLength = Math.max(a.length, b.length);

  const loopStart = isBigEndian ? 0 : maxLength - 1;
  const loopEnd = isBigEndian ? maxLength : -1;
  const loopStep = isBigEndian ? 1 : -1;

  for (let i = loopStart; isBigEndian ? i < loopEnd : i > loopEnd; i += loopStep) {
    const aValue = a[i] || 0;
    const bValue = b[i] || 0;

    if (aValue < bValue) {
      return 1;
    }
    if (aValue > bValue) {
      return -1;
    }
  }

  return 0;
}

