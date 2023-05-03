export const  FieldSubWGSL =
`
fn field_sub(a: Field, b: Field) -> Field {
  var sub: Field;
  if (gte(a, b)) {
    sub = u256_sub(a, b);
  } else {
    var b_minus_a: Field = u256_sub(b, a);
    sub = u256_sub(ALEO_FIELD_ORDER, b_minus_a);
  }

  return sub;
}
`;