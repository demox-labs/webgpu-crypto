export const CurveWGSL = `
// 3021
const EDWARDS_D: Field = Field (
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 3021)
);

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

const ZERO_POINT = Point (U256_ZERO, U256_ONE, U256_ONE, U256_ZERO);
const ZERO_AFFINE = AffinePoint (U256_ZERO, U256_ONE);

fn mul_by_a(f: Field) -> Field {
  // mul by a is just negation of f
  return u256_sub(ALEO_FIELD_ORDER, f);
}

// follows aleo's projective addition algorithm
fn add_points(p1: Point, p2: Point) -> Point {
  var a = field_multiply(p1.x, p2.x);
  var b = field_multiply(p1.y, p2.y);
  var c = field_multiply(EDWARDS_D, field_multiply(p1.t, p2.t));
  var d = p1.z;
  var e = field_multiply(field_multiply(p1.x, p2.y), field_multiply(p2.x, p1.y));
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
  var result = ZERO_POINT;
  var temp = p;
  var scalar_iter = scalar;
  while (!equal(scalar_iter, U256_ZERO)) {
    if (is_odd(scalar_iter)) {
      result = add_points(result, temp);
    }

    temp = double_point(temp);

    scalar_iter = u256_rs1(scalar_iter);
  }

  return result;
}
`;