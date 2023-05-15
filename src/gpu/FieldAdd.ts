export const FieldAddWGSL =
`
fn field_add(a: Field, b: Field) -> Field {
  var sum = u256_add(a, b);
  var result = field_reduce(sum);
  return result;
}
`;