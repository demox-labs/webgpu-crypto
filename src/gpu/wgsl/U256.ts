export const U256WGSL =
`
// big endian
struct u256 {
  components: array<u32, 8>
}

// 115792089237316195423570985008687907853269984665640564039457584007913129639935
const U256_MAX: u256 = u256(
  array<u32, 8>(4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295, 4294967295)
);

const U256_SEVENTEEN: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 17)
);

const U256_ONE: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 1)
);

const U256_TWO: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 2)
);

const U256_THREE: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 3)
);

const U256_FOUR: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 4)
);

const U256_EIGHT: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 8)
);

const U256_ZERO: u256 = u256(
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0)
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

fn u256_rs1(a: u256) -> u256 {
  var right_shifted: u256 = u256 (
    array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0)
  );
  var carry: u32 = 0u;
  for (var i = 0u; i < 8u; i++) {
    var componentResult = a.components[i] >> 1u;
    componentResult = componentResult | carry;
    right_shifted.components[i] = componentResult;
    carry = a.components[i] << 31u;
  }

  return right_shifted;
}

fn is_even(a: u256) -> bool {
  return (a.components[7u] & 1u) == 0u;
}

fn is_odd(a: u256) -> bool {
  return (a.components[7u] & 1u) == 1u;
}

fn is_odd_32_bits(a: u32) -> bool {
  return (a & 1u) == 1u;
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
    if (a.components[i] != b.components[i]) {
      return a.components[i] > b.components[i];
    }
  }
  // if a's components are never greater, than a is equal to b
  return false;
}

// returns whether a >= b
fn gte(a: u256, b: u256) -> bool {
  for (var i = 0u; i < 8u; i++) {
    if (a.components[i] != b.components[i]) {
      return a.components[i] > b.components[i];
    }
  }
  // if none of the components are greater or smaller, a is equal to b
  return true;
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

fn component_right_shift(a: u32, shift: u32, carry: u32) -> vec2<u32> { 
  var shifted: vec2<u32>;
  shifted[0] = (a >> shift) + carry;
  shifted[1] = a << (32u - shift);

  return shifted;
}

fn u256_right_shift(a: u256, shift: u32) -> u256 {
  var components_to_drop = shift / 32u;
  if (components_to_drop >= 8u) {
    return U256_ZERO;
  }

  var big_shift: u256 = u256(
    array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 0)
  );

  // Shift out the components that need dropping
  for (var i = components_to_drop; i < 8u; i++) {
    big_shift.components[i] = a.components[i-components_to_drop];
  }

  var shift_within_component = shift % 32u;

  if (shift_within_component == 0u) {
    return big_shift;
  }

  var carry: u32 = 0u;
  for (var i = components_to_drop; i < 8u; i++) {
    let componentResult = component_right_shift(big_shift.components[i], shift_within_component, carry);
    big_shift.components[i] = componentResult[0];
    carry = componentResult[1];
  }

  return big_shift;
}
`;