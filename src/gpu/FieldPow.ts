export const FieldPowWGSL = `
// assume base is not 0
fn field_pow(base: Field, exponent: Field) -> Field {
  if (equal(exponent, U256_ZERO)) {
    return U256_ONE;
  }
  
  if (equal(exponent, U256_ONE)) {
    return base;
  }

  var n = exponent;
  var x = base;
  var y = U256_ONE;
  while (gt(n, U256_ONE)) {
    if (is_even(n)) {
      x = field_multiply(x, x);
      n = u256_rs1(n);
    } else {
      y = field_multiply(x, y);
      x = field_multiply(x, x);
      n = u256_sub(n, U256_ONE);
      n = u256_rs1(n);
    }
  }

  return field_multiply(x, y);
}
`;