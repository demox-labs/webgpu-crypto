export const  FieldDoubleWGSL =
`
fn field_double(a: Field) -> Field {
  var double = u256_double(a);
  var result = field_reduce(double);
  return result;
}
`;