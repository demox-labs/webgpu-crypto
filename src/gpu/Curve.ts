export const CurveWGSL = `
// 3021
const EDWARDS_D: Field = Field (
  array<u32, 8>(0, 0, 0, 0, 0, 0, 0, 3021)
);

struct AffinePiont {
  x: Field,
  y: Field
}

struct Point {
  x: Field,
  y: Field,
  t: Field,
  z: Field
}

fn mul_by_a(f: Field) -> Field {
  // mul by a is just negation of f
  return u256_sub(ALEO_FIELD_ORDER, f);
}

// follows aleo's projective addition algorithm
fn add_points(p1: Point, p2: Point) -> Point {
  var a = field_mul(p1.x, p2.x);
  var b = field_mul(p1.y, p2.y);
  var c = field_mul(EDWARDS_D, field_mul(p1.t, p2.t));
  var d = p1.z;
  var e = field_mul(field_mul(p1.x, p2.y), field_mul(p2.x, p1.y));
  e = field_sub(e, a);
  e = field_sub(e, b);
  var f = field_sub(d, c);
  var g = field_add(d, c);
  var a_neg = mul_by_a(a);
  var h = field_sub(b, a_neg);
  var added_x = field_mul(e, f);
  var added_y = field_mul(g, h);
  var added_t = field_mul(e, h);
  var added_z = field_mul(f, g);
  return Point(added_x, added_y, added_t, added_z);
}
 `;