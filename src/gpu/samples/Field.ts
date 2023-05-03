export const FieldWGSL = `
struct Field {
  components: array<u32, 8>
}

struct Fields {
  fields: array<Field>
}

// 8444461749428370424248824938781546531375899335154063827935233455917409239041
const ALEO_FIELD_ORDER: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 1)
);

fn add_components(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
  var sum: vec2<u32>;
  let total = a + b + carry_in;
  // potential bitwise speed ups here
  sum[0] = total;
  sum[1] = 0u;
  // if the total is less than a, then we know there was a carry
  // need to subtract the carry_in for the edge case though, where the two largest
  // u32s are added together.
  if ((total - carry_in) < a) {
    sum[1] = 1u;
  }
  return sum;
}

fn sub_components(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
  var sub: vec2<u32>;
  let total = a - b - carry_in;
  sub[0] = total;
  sub[1] = 0u;
  if ((total + carry_in) > a) {
    sub[1] = 1u;
  }
  return sub;
}

fn field_add(a: Field, b: Field) -> Field {
  var sum: Field;
  sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
  var carry: u32 = 0u;

  for (var i = 7i; i >= 0i; i--) {
      let componentResult = add_components(a.components[i], b.components[i], carry);
      sum.components[i] = componentResult[0];
      carry = componentResult[1];
  }

  var resultGreaterThanAleoFieldOrder = false;

  for (var i = 0u; i < 8u; i++) {
    if (sum.components[i] > ALEO_FIELD_ORDER.components[i]) {
      resultGreaterThanAleoFieldOrder = true;
      break;
    }

    if (sum.components[i] < ALEO_FIELD_ORDER.components[i]) {
      break;
    }

    if (i == 7u && sum.components[i] == ALEO_FIELD_ORDER.components[i]) {
      resultGreaterThanAleoFieldOrder = true;
    }
  }

  if (resultGreaterThanAleoFieldOrder) {
    carry = 0u;
    for (var i = 7i; i >= 0i; i--) {
      let componentResult = sub_components(sum.components[i], ALEO_FIELD_ORDER.components[i], carry);
      sum.components[i] = componentResult[0];
      carry = componentResult[1];
    }
  }

  return sum;
}`;