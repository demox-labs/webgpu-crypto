export const FieldSqrtWGSL = `
fn gen_field_reduce(a: u256, field_order: u256) -> Field {
  var reduction: Field = a;
  var a_gte_field_order = gte(a, field_order);

  while (a_gte_field_order) {
    reduction = u256_sub(reduction, field_order);
    a_gte_field_order = gte(reduction, field_order);
  }

  return reduction;
}

fn gen_field_multiply(a: Field, b: Field, field_order: u256) -> Field {
  var accumulator: Field = Field(
    array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0)
  );
  var newA: Field = a;
  var newB: Field = b;
  while (gt(newB, U256_ZERO)) {
    if ((newB.components[7] & 1u) == 1u) {
      accumulator = u256_add(accumulator, newA);
      if (gte(accumulator, field_order)) {
        accumulator = u256_subw(accumulator, field_order);
      }
    }
    newA = u256_double(newA);
    newA = gen_field_reduce(newA, field_order);
    newB = u256_rs1(newB);
  }

  return accumulator;
}

fn gen_field_pow(base: Field, exponent: Field, field_order: u256) -> Field { 
  if (equal(exponent, U256_ZERO)) { 
    return U256_ONE;
  }

  if (equal(exponent, U256_ONE)) { 
    return base;
  }

  var exp = exponent;
  var bse = base;
  var result: u256 = u256(
    array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 1)
  );
  while (gt(exp, U256_ZERO)) { 
    if (is_odd(exp)) {
      result = gen_field_multiply(result, bse, field_order);
    }

    exp = u256_rs1(exp);
    bse = gen_field_multiply(bse, bse, field_order);
  }

  return result;
}

// S-Tonelli computes different values given a big int n and a prime p. Because our prime is the
// Aleo field modulus, we have precomputed some of the values in advance to optimize for the GPU.

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