export const FieldModulusWGSL = 
`
alias Field = u256;

fn field_reduce(a: u256) -> Field {
  var reduction: Field = a;
  var a_gte_ALEO = gte(a, FIELD_ORDER);

  while (a_gte_ALEO) {
    reduction = u256_sub(reduction, FIELD_ORDER);
    a_gte_ALEO = gte(reduction, FIELD_ORDER);
  }

  return reduction;
}

fn field_add(a: Field, b: Field) -> Field {
  var sum = u256_add(a, b);
  var result = field_reduce(sum);
  return result;
}

fn field_sub(a: Field, b: Field) -> Field {
  var sub: Field;
  if (gte(a, b)) {
    sub = u256_sub(a, b);
  } else {
    var b_minus_a: Field = u256_sub(b, a);
    sub = u256_sub(FIELD_ORDER, b_minus_a);
  }

  return sub;
}

fn field_double(a: Field) -> Field {
  var double = u256_double(a);
  var result = field_reduce(double);
  return result;
}

fn field_multiply(a: Field, b: Field) -> Field {
  var accumulator: Field = Field(
    array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0)
  );
  var newA: Field = a;
  var newB: Field = b;
  var count: u32 = 0u;

  while (gt(newB, U256_ZERO)) {
    if ((newB.components[7] & 1u) == 1u) {
      accumulator = u256_add(accumulator, newA);
      
      var accumulator_gte_ALEO = gte(accumulator, FIELD_ORDER);

      if (accumulator_gte_ALEO) {
        accumulator = u256_sub(accumulator, FIELD_ORDER);
      }
      
    }
    
    newA = u256_double(newA);
    newA = field_reduce(newA);
    newB = u256_right_shift(newB, 1u);
    count = count + 1u;
  }

  return accumulator;
}

fn field_pow(base: Field, exponent: Field) -> Field {
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
      result = field_multiply(result, bse);
    }

    exp = u256_rs1(exp);
    bse = field_multiply(bse, bse);
  }

  return result;
}

fn field_pow_by_17(base: Field) -> Field {
  let bse = base;
  let base2 = field_multiply(bse, bse);
  let base4 = field_multiply(base2, base2);
  let base8 = field_multiply(base4, base4);
  let base16 = field_multiply(base8, base8);
  return field_multiply(base16, bse);
}

// assume that the input is NOT 0, as there's no inverse for 0
// this function implements the Guajardo Kumar Paar Pelzl (GKPP) algorithm,
// Algorithm 16 (BEA for inversion in Fp)
fn field_inverse(num: Field) -> Field {
  var u: Field = num;
  var v: u256 = FIELD_ORDER;
  var b: Field = U256_ONE;
  var c: Field = U256_ZERO;

  while (!equal(u, U256_ONE) && !equal(v, U256_ONE)) {
    while (is_even(u)) {
      // divide by 2
      u = u256_rs1(u);

      if (is_even(b)) {
        // divide by 2
        b = u256_rs1(b);
      } else {
        b = u256_add(b, FIELD_ORDER);
        b = u256_rs1(b);
      }
    }

    while (is_even(v)) {
      // divide by 2
      v = u256_rs1(v);
      if (is_even(c)) {
        c = u256_rs1(c);
      } else {
        c = u256_add(c, FIELD_ORDER);
        c = u256_rs1(c);
      }
    }

    if (gte(u, v)) {
      u = u256_sub(u, v);
      b = field_sub(b, c);
    } else {
      v = u256_sub(v, u);
      c = field_sub(c, b);
    }
  }

  if (equal(u, U256_ONE)) {
    return field_reduce(b);
  } else {
    return field_reduce(c);
  }
}

fn gen_field_reduce(a: u256, field_order: u256) -> Field {
  var reduction: Field = a;
  var a_gte_field_order = gte(a, field_order);

  while (a_gte_field_order) {
    reduction = u256_sub(reduction, field_order);
    a_gte_field_order = gte(reduction, field_order);
  }

  return reduction;
}

fn gen_field_add(a: Field, b: Field, field_order: Field) -> Field {
  var sum = u256_add(a, b);
  var result = gen_field_reduce(sum, field_order);
  return result;
}

fn gen_field_sub(a: Field, b: Field, field_order: Field) -> Field {
  var sub: Field;
  if (gte(a, b)) {
    sub = u256_sub(a, b);
  } else {
    var b_minus_a: Field = u256_sub(b, a);
    sub = u256_sub(field_order, b_minus_a);
  }

  return sub;
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
`