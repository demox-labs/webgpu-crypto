export const FieldModulusWGSL = 
`
// big endian
struct u256 {
  components: array<u32, 8>
}

struct u256s {
  u256s: array<u256>
}

alias Field = u256;

struct Fields {
  fields: array<Field>
}

// 8444461749428370424248824938781546531375899335154063827935233455917409239041
const ALEO_FIELD_ORDER: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 1)
);

// 115792089237316195423570985008687907853269984665640564039457584007913129639935
const U256_MAX: u256 = u256(
  array<u32, 8>(4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295)
);

const U256_ONE: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 1)
);

// 8444461749428370424248824938781546531375899335154063827935233455917409239042
const ALEO_FIELD_ORDER_PLUS_ONE: Field = Field(
    array<u32, 8>(313222494, 2586617174, 1622428958, 1547153409, 1504343806, 3489660929, 168919040, 2)
);

// adds u32s together, returns a vector of the result and the carry (either 0 or 1)
fn add_components(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
  var sum: vec2<u32>;
  let total = a + b + carry_in;
  // potential bitwise speed ups here
  sum[0] = total;
  sum[1] = 0u;
  // if the total is less than a, then we know there was a carry
  // need to subtract the carry_in for the edge case though, where a or b is 2^32 - 1 and carry_in is 1
  if (total < a || (total - carry_in) < a) {
    sum[1] = 1u;
  }
  return sum;
}

// subtracts u32s together, returns a vector of the result and the carry (either 0 or 1)
fn sub_components(a: u32, b: u32, carry_in: u32) -> vec2<u32> {
  var sub: vec2<u32>;
  let total = a - b - carry_in;
  sub[0] = total;
  sub[1] = 0u;
  // if the total is greater than a, then we know there was a carry from a less significant component.
  // need to add the carry_in for the edge case though, where a carry_in of 1 causes a component of a to underflow
  if (total > a || (total + carry_in) > a) {
    sub[1] = 1u;
  }
  return sub;
}

// no overflow checking for u256
fn u256_add(a: u256, b: u256) -> u256 {
  var sum: u256;
  sum.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
  var carry: u32 = 0u;

  for (var i = 7i; i >= 0i; i--) {
    let componentResult = add_components(a.components[i], b.components[i], carry);
    sum.components[i] = componentResult[0];
    carry = componentResult[1];
  }

  return sum;
}

// no underflow checking for u256
fn u256_sub(a: u256, b: u256) -> u256 {
  var sub: u256;
  sub.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
  var carry: u32 = 0u;
  for (var i = 7i; i >= 0i; i--) {
    let componentResult = sub_components(a.components[i], b.components[i], carry);
    sub.components[i] = componentResult[0];
    carry = componentResult[1];
  }

  return sub;
}

// underflow allowed u256 subtraction
fn u256_subw(a: u256, b: u256) -> u256 {
  var sub: u256;
  if (gte(a, b)) {
    sub = u256_sub(a, b);
  } else {
    var b_minus_a: u256 = u256_sub(b, a);
    var b_minus_a_minus_one: u256 = u256_sub(b_minus_a, U256_ONE);
    sub = u256_sub(U256_MAX, b_minus_a_minus_one);
  }

  return sub;
}

fn equal(a: u256, b: u256) -> bool {
  for (var i = 0u; i < 8u; i++) {
    if (a.components[i] != b.components[i]) {
      return false;
    }
  }

  return true;
}

// returns whether a > b
fn gt(a: u256, b: u256) -> bool {
  for (var i = 0u; i < 8u; i++) {
    if (a.components[i] < b.components[i]) {
      return false;
    }

    if (a.components[i] > b.components[i]) {
      return true;
    }
  }
  // if a's components are never greater, than a is equal to b
  return false;
}

// returns whether a >= b
fn gte(a: u256, b: u256) -> bool {
  for (var i = 0u; i < 8u; i++) {
    if (a.components[i] < b.components[i]) {
      return false;
    }

    if (a.components[i] > b.components[i]) {
      return true;
    }
  }
  // if a's components are never greater, than a is equal to b
  return true;
}

// reduces once (assumes that 0 <= a < 2 * ALEO_FIELD_ORDER)
fn field_reduce(a: u256) -> Field {
  var reduction: Field = a;
  var a_gte_ALEO = gte(a, ALEO_FIELD_ORDER);

  while (a_gte_ALEO) {
    reduction = u256_sub(reduction, ALEO_FIELD_ORDER);
    a_gte_ALEO = gte(reduction, ALEO_FIELD_ORDER);
  }

  return reduction;
}

fn component_double(a: u32, carry: u32) -> vec2<u32> {
  var double: vec2<u32>;
  let total = a << 1u;

  double[0] = total + carry;
  double[1] = 0u;

  if (total < a) {
    double[1] = 1u;
  }
  return double;
}

fn u256_double(a: u256) -> u256 {
  var double: u256;
  double.components = array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0);
  var carry: u32 = 0u;

  for (var i = 7i; i >= 0i; i--) {
    let componentResult = component_double(a.components[i], carry);
    double.components[i] = componentResult[0];
    carry = componentResult[1];
  }

  return double;
}
`