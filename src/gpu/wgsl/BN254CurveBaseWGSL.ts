export const BN254CurveBaseWGSL = `
const ZERO_POINT = Point (U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);
const ZERO_AFFINE = AffinePoint (U256_ZERO, U256_ONE);

// follows http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian.html#addition-add-2007-bl
// fn add_points(p1: Point, p2: Point) -> Point {
//   var z1z1 = field_multiply(p1.z, p1.z);
//   var z2z2 = field_multiply(p2.z, p2.z);
//   var u1 = field_multiply(p1.x, z2z2);
//   var u2 = field_multiply(p2.x, z1z1);
//   var s1 = field_multiply(p1.y, field_multiply(p2.z, z2z2));
//   var s2 = field_multiply(p2.y, field_multiply(p1.z, z1z1));
//   var h = field_sub(u2, u1);
//   var sqrt_i = field_double(h);
//   var i = field_multiply(sqrt_i, sqrt_i);
//   var j = field_multiply(h, i);
//   var r = field_double(field_sub(s2, s1));
//   var v = field_multiply(u1, i);
//   var r_square = field_multiply(r, r);
//   var intermediate_x = field_sub(r_square, j);
//   var x_result = field_sub(intermediate_x, field_double(v));
//   var intermediate_y = field_multiply(r, field_sub(v, x_result));
//   var y_result = field_sub(intermediate_y, field_double(field_multiply(s1, j)));
//   var t_result = field_multiply(x_result, y_result);
//   var zs_added = field_add(p1.z, p2.z);
//   var intermediate_z = field_sub(field_multiply(zs_added, zs_added), z1z1);
//   var z_result = field_multiply(field_sub(intermediate_z, z2z2), h);
//   return Point(x_result, y_result, t_result, z_result);
// }

fn add_points(p1: Point, p2: Point) -> Point {
  if (equal(p1.x, U256_ZERO) && equal(p1.y, U256_ONE) && equal(p1.z, U256_ONE)) {
    return p2;
  }
  if (equal(p2.x, U256_ZERO) && equal(p2.y, U256_ONE) && equal(p2.z, U256_ONE)) {
    return p1;
  }
  var z1z1 = field_multiply(p1.z, p1.z);
  var z2z2 = field_multiply(p2.z, p2.z);
  var s2 = field_multiply(z1z1, p1.z);
  var u2 = field_multiply(z1z1, p2.x);
  s2 = field_multiply(s2, p2.y);
  var u1 = field_multiply(z2z2, p1.x);
  var s1 = field_multiply(z2z2, p2.z);
  s1 = field_multiply(s1, p1.y);
  var f = field_double(field_sub(s2, s1));
  if (equal(f, U256_ZERO)) {
    return double_point(p1);
  }
  var h = field_sub(u2, u1);
  var i = field_double(h);
  i = field_multiply(i, i);
  var j = field_multiply(h, i);
  u1 = field_multiply(u1, i);
  u2 = field_double(u1);
  u2 = field_add(u2, j);
  var x_result = field_multiply(f, f);
  x_result = field_sub(x_result, u2);
  j = field_multiply(j, s1);
  j = field_double(j);
  var y_result = field_sub(u1, x_result);
  y_result = field_multiply(f, y_result);
  y_result = field_sub(y_result, j);
  var z_result = field_add(p1.z, p2.z);
  z1z1 = field_add(z1z1, z2z2);
  z_result = field_multiply(z_result, z_result);
  z_result = field_sub(z_result, z1z1);
  z_result = field_multiply(z_result, h);
  var t_result = field_multiply(x_result, y_result);
  return Point(x_result, y_result, t_result, z_result);
}

// // follows http://www.hyperelliptic.org/EFD/g1p/auto-shortw-jacobian.html#doubling-dbl-2007-bl
// fn double_point(p: Point) -> Point {
//   var xx = field_multiply(p.x, p.x);
//   var yy = field_multiply(p.y, p.y);
//   var yyyy = field_multiply(yy, yy);
//   var zz = field_multiply(p.z, p.z);
//   var x1_add_yy = field_add(p.x, yy);
//   var s_intermediate = field_sub(field_multiply(x1_add_yy, x1_add_yy), xx);
//   var s = field_double(field_sub(s_intermediate, yyyy));
//   var m = field_multiply(U256_THREE, xx);
//   var x_result = field_sub(field_multiply(m, m), field_double(s));
//   var intermediate_y = field_multiply(m, field_sub(s, x_result));
//   var y_result = field_sub(intermediate_y, field_multiply(U256_EIGHT, yyyy));
//   var t_result = field_multiply(x_result, y_result);
//   var y_add_z = field_add(p.y, p.z);
//   var y_add_z_squared = field_multiply(y_add_z, y_add_z);
//   var z_result = field_sub(field_sub(y_add_z_squared, yy), zz);
//   return Point(x_result, y_result, t_result, z_result);
// }

// follows aztec protocol implementation
fn double_point(p: Point) -> Point {
  var T0 = field_multiply(p.x, p.x);
  var T1 = field_multiply(p.y, p.y);
  var T2 = field_multiply(T1, T1);
  T1 = field_add(p.x, T1);
  T1 = field_multiply(T1, T1);
  var T3 = field_add(T0, T2);
  T1 = field_sub(T1, T3);
  T1 = field_double(T1);
  T3 = field_double(T0);
  T3 = field_add(T3, T0);
  var z_result = field_double(p.z);
  z_result = field_multiply(z_result, p.y);
  T0 = field_double(T1);
  var x_result = field_multiply(T3, T3);
  x_result = field_sub(x_result, T0);
  T2 = field_double(T2);
  T2 = field_double(T2);
  T2 = field_double(T2);
  var y_result = field_sub(T1, x_result);
  y_result = field_multiply(T3, y_result);
  y_result = field_sub(y_result, T2);
  var t_result = field_multiply(x_result, y_result);
  return Point(x_result, y_result, t_result, z_result);
}

fn normalize_x(x: Field, z: Field) -> Field {
  var z_inverse = field_inverse(z);
  var z_inv_squared = field_multiply(z_inverse, z_inverse);
  return field_multiply(x, z_inv_squared);
}
`;