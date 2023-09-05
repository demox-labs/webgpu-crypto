import { CurveType, getModulus } from "../gpu/params";

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
  const exp_next_calc = (q+BigInt(1))/BigInt(2);
  let r = pow_mod(n, exp_next_calc, p);
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

export const preComputedTShanks = (n: bigint, curve: CurveType): bigint => {
  let q = BigInt(0);
  let s = BigInt(0);
  let p = BigInt(1);
  let c = BigInt(0);
  let exp_next_calc = BigInt(0);
  
  switch (curve) {
    case CurveType.BLS12_377:
      q = BigInt('60001509534603559531609739528203892656505753216962260608619555');
      s = BigInt(47);
      p = getModulus(curve);
      c = BigInt('6924886788847882060123066508223519077232160750698452411071850219367055984476');
      exp_next_calc = BigInt('30000754767301779765804869764101946328252876608481130304309778');
      break;
    case CurveType.BN254:
      q = BigInt('81540058820840996586704275553141814055101440848469862132140264610111');
      s = BigInt(28);
      p = getModulus(curve);
      c = BigInt('19103219067921713944291392827692070036145651957329286315305642004821462161904');
      exp_next_calc = BigInt('40770029410420498293352137776570907027550720424234931066070132305056');
      break;
    default:
      throw new Error('Unsupported curve type for Shanks Tonelli');
  }

  let r = pow_mod(n, exp_next_calc, p);
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