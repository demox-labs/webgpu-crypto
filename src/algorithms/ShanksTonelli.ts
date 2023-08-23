import { FIELD_MODULUS } from "../params/BLS12_377Constants";

const pow_mod = (x: bigint, n: bigint, p: bigint): bigint => {
  if (n === BigInt(0)) return BigInt(1);
  if (n & BigInt(1))
    return (pow_mod(x, n-BigInt(1), p) * x) % p;
  x = pow_mod(x, n/BigInt(2), p);
  return (x * x) % p;
}

/* Takes as input an odd prime p and n < p and returns r
 * such that r * r = n [mod p]. */
export const tonelli_shanks = (n: bigint, p: bigint): bigint => {
  let s = BigInt(0);
  let q = p - BigInt(1);
  while ((q & BigInt(1)) === BigInt(0)) {
    q /= BigInt(2);
    s++;
  }
  if (s === BigInt(1)) {
    const r = pow_mod(n, (p+BigInt(1))/BigInt(4), p);
    if ((r * r) % p === n)
      return r;
    return BigInt(0);
  }
  // Find the first quadratic non-residue z by brute-force search
  let z = BigInt(1);
  while (pow_mod(z, (p-BigInt(1))/BigInt(2), p) !== p - BigInt(1)) {
    z++;
  }
  let c = pow_mod(z, q, p);
  let r = pow_mod(n, (q+BigInt(1))/BigInt(2), p);
  let t = pow_mod(n, q, p);
  let m = s;
  while (t !== BigInt(1)) {
    let tt = t;
    let i = BigInt(0);
    while (tt !== BigInt(1)) {
      tt = (tt * tt) % p;
      i++;
      if (i === m)
        return BigInt(0);
    }
    const b = pow_mod(c, pow_mod(BigInt(2), m-i-BigInt(1), p-BigInt(1)), p);
    const b2 = (b * b) % p;
    r = (r * b) % p;
    t = (t * b2) % p;
    c = b2;
    m = i;
  }
  if ((r * r) % p === n) return r;
  return BigInt(0);
}

export const preComputedTShanks = (n: bigint): bigint => {
  const q = BigInt('60001509534603559531609739528203892656505753216962260608619555');
  const s = BigInt(47);
  const p = FIELD_MODULUS;
  let c = BigInt('6924886788847882060123066508223519077232160750698452411071850219367055984476')
  let r = pow_mod(n, BigInt('30000754767301779765804869764101946328252876608481130304309778'), p);
  let t = pow_mod(n, q, p);
  let m = s;
  while (t !== BigInt(1)) {
    let tt = t;
    let i = BigInt(0);
    while (tt !== BigInt(1)) {
      tt = (tt * tt) % p;
      i++;
      if (i === m)
        return BigInt(0);
    }
    const b = pow_mod(c, pow_mod(BigInt(2), m-i-BigInt(1), p-BigInt(1)), p);
    const b2 = (b * b) % p;
    r = (r * b) % p;
    t = (t * b2) % p;
    c = b2;
    m = i;
  }
  if ((r * r) % p === n) return r;
  return BigInt(0);
}