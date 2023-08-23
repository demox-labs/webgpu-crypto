export const CurveWGSL = `
struct AffinePoint {
  x: Field,
  y: Field
}

struct Point {
  x: Field,
  y: Field,
  t: Field,
  z: Field
}

struct MulPointIntermediate {
  result: Point,
  temp: Point,
  scalar: Field
}

const ZERO_POINT = Point (U256_ZERO, U256_ONE, U256_ONE, U256_ZERO);
const ZERO_AFFINE = AffinePoint (U256_ZERO, U256_ONE);

fn mul_by_a(f: Field) -> Field {
  // mul by a is just negation of f
  return u256_sub(FIELD_ORDER, f);
}

// follows aleo's projective addition algorithm
fn add_points(p1: Point, p2: Point) -> Point {
  var a = field_multiply(p1.x, p2.x);
  var b = field_multiply(p1.y, p2.y);
  var c = field_multiply(EDWARDS_D, field_multiply(p1.t, p2.t));
  var d = field_multiply(p1.z, p2.z);
  var p1_added = field_add(p1.x, p1.y);
  var p2_added = field_add(p2.x, p2.y);
  var e = field_multiply(field_add(p1.x, p1.y), field_add(p2.x, p2.y));
  e = field_sub(e, a);
  e = field_sub(e, b);
  var f = field_sub(d, c);
  var g = field_add(d, c);
  var a_neg = mul_by_a(a);
  var h = field_sub(b, a_neg);
  var added_x = field_multiply(e, f);
  var added_y = field_multiply(g, h);
  var added_t = field_multiply(e, h);
  var added_z = field_multiply(f, g);
  return Point(added_x, added_y, added_t, added_z);
}

fn double_point(p: Point) -> Point {
  var a = field_multiply(p.x, p.x);
  var b = field_multiply(p.y, p.y);
  var c = field_double(field_multiply(p.z, p.z));
  var d = mul_by_a(a);
  var e = field_add(p.x, p.y);
  e = field_multiply(e, e);
  e = field_sub(e, a);
  e = field_sub(e, b);
  var g = field_add(d, b);
  var f = field_sub(g, c);
  var h = field_sub(d, b);
  var doubled_x = field_multiply(e, f);
  var doubled_y = field_multiply(g, h);
  var doubled_t = field_multiply(e, h);
  var doubled_z = field_multiply(f, g);
  return Point(doubled_x, doubled_y, doubled_t, doubled_z);
}

fn mul_point(p: Point, scalar: Field) -> Point {
  var result: Point = Point (U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);
  var temp = p;
  var scalar_iter = scalar;
  while (!equal(scalar_iter, U256_ZERO)) {
    if (is_odd(scalar_iter)) {
      result = add_points(result, temp);
      // result = temp;
    }

    temp = double_point(temp);

    scalar_iter = u256_rs1(scalar_iter);
  }

  return result;
}

fn mul_point_64_bits_start(p: Point, scalar: Field) -> MulPointIntermediate { 
  var result: Point = Point (U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);
  var temp = p;
  var scalar_iter = scalar;
  for (var i = 0u; i < 64u; i = i + 1u) {
    if (equal(scalar_iter, U256_ZERO)) {
      break;
    }

    if (is_odd(scalar_iter)) {
      result = add_points(result, temp);
    }

    temp = double_point(temp);

    scalar_iter = u256_rs1(scalar_iter);
  }

  return MulPointIntermediate(result, temp, scalar_iter);
}

fn mul_point_64_bits(p: Point, scalar: Field, t: Point) -> MulPointIntermediate {
  if (equal(scalar, U256_ZERO)) {
    return MulPointIntermediate(p, t, scalar);
  }

  var result: Point = p;
  var temp = t;
  var scalar_iter = scalar;
  for (var i = 0u; i < 64u; i = i + 1u) {
    if (equal(scalar_iter, U256_ZERO)) { 
      break;
    }

    if (is_odd(scalar_iter)) {
      result = add_points(result, temp);
    }

    temp = double_point(temp);

    scalar_iter = u256_rs1(scalar_iter);
  }

  return MulPointIntermediate(result, temp, scalar_iter);
}

fn mul_point_test(p: Point, scalar: Field) -> Point {
  var result: Point = Point (U256_ZERO, U256_ONE, U256_ONE, U256_ZERO);
  var temp = p;
  var scalar_iter = scalar;
  while (!equal(scalar_iter, U256_ZERO)) {
    if ((scalar_iter.components[7u] & 1u) == 1u) {
      var added = add_points(result, temp);
      result = added;
    }

    temp = double_point(temp);

    var right_shifted = u256_rs1(scalar_iter);
    scalar_iter = right_shifted;
  }

  return result;
}

// fn get_y(x: Field) -> Field {
//   var x_squared = field_multiply(x, x);
//   var numerator = field_sub(FIELD_ORDER_MINUS_ONE, x_squared);
//   var denominator = field_add(EDWARDS_D_PLUS_ONE, x_squared);
//   var denominator_inverse = field_inverse(denominator);
//   var y_squared = field_mul(numerator, denominator_inverse);
//   var y = field_sqrt(y_squared);
//   var neg_y = u256_sub(FIELD_ORDER, y);
// }
`;