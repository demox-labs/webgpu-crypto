export const  FieldSubWGSL =
`
fn field_sub(a: Field, b: Field) -> Field {
  var sub: Field;
  if (gte(a, b)) {
    sub = u256_sub(a, b);
  } else {
    var b_minus_a: Field = u256_sub(b, a);
    // var b_minus_a_plus_one: Field = u256_add(b_minus_a, U256_ONE);
    sub = u256_sub(ALEO_FIELD_ORDER, b_minus_a);
  }

  return sub;
}
`;