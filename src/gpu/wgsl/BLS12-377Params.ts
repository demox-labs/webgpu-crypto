export const BLS12_377ParamsWGSL =
`
// 8444461749428370424248824938781546531375899335154063827935233455917409239041
const FIELD_ORDER: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 1)
);

// 8444461749428370424248824938781546531375899335154063827935233455917409239042
const FIELD_ORDER_PLUS_ONE: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 2)
);

// 8444461749428370424248824938781546531375899335154063827935233455917409239040
const FIELD_ORDER_MINUS_ONE: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 0)
);

// S-Tonelli computes different values given a big int n and a prime p. Because our prime is the
// BLS12-377 field modulus, we have precomputed some of the values in advance to optimize for the GPU.

// 6924886788847882060123066508223519077232160750698452411071850219367055984476
const c_initial: Field = Field (
  array<u32, 8>(256858326, 3006847798, 1208683936, 2370827163, 3854692792, 1079629005, 1919445418, 2787346268)
);

const s: Field = Field (
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 47)
);

// 60001509534603559531609739528203892656505753216962260608619555
const q: Field = Field (
  array<u32, 8>(0, 9558, 3401397337, 1252835688, 2587670639, 1610789716, 3992821760, 136227)
);

// 30000754767301779765804869764101946328252876608481130304309778
const r_initial_exponent: Field = Field (
  array<u32, 8>(0, 4779, 1700698668, 2773901492, 1293835319, 2952878506, 1996410880, 68114)
);

// 3021
const EDWARDS_D: Field = Field (
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 3021)
);

const EDWARDS_D_PLUS_ONE: Field = Field(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 3022)
);

// assumes that num is indeed a square root residue.
// follows the Shanks Tonelli algorithm. View shankstonelli.ts for the non-shortened version.
fn field_sqrt(num: Field) -> Field {
  var c: Field = c_initial;
  var r: Field = gen_field_pow(num, r_initial_exponent, FIELD_ORDER);
  var t: Field = gen_field_pow(num, q, FIELD_ORDER);
  var m: Field = s;

  while (!equal(t, U256_ONE)) {
    var tt: Field = t;
    var i: Field = U256_ZERO;
    while (!equal(tt, U256_ONE)) {
      tt = field_multiply(tt, tt);
      i = u256_add(i, U256_ONE);
      if (equal(i, m)) {
        return U256_ZERO;
      }
    }

    var b_exp_exp: Field = u256_sub(m, u256_add(i, U256_ONE));
    var b_exp: Field = gen_field_pow(U256_TWO, b_exp_exp, FIELD_ORDER_MINUS_ONE);
    var b: Field = gen_field_pow(c, b_exp, FIELD_ORDER);
    var b2: Field = field_multiply(b, b);
    r = field_multiply(r, b);
    t = field_multiply(t, b2);
    c = b2;
    m = i;
  }

  return r;
}
`;