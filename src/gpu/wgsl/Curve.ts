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

fn mul_point_32_bit_scalar(p: Point, scalar: u32) -> Point {
  var result: Point = Point (U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);
  var temp = p;
  var scalar_iter = scalar;
  while (!(scalar_iter == 0u)) {
    if ((scalar_iter & 1u) == 1u) {
      result = add_points(result, temp);
    }

    temp = double_point(temp);

    scalar_iter = scalar_iter >> 1u;
  }

  return result;
}

fn mul_point(p: Point, scalar: Field) -> Point {
  var result: Point = Point (U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);
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

// Additional required functions
fn get_bits(x: Field, start: u32, length: u32) -> u32 {
  let bit_pos: u32 = start % 32;  // Bit position within the u32 component
  let idx: u32 = 7 - (start / 32);  // Index of the u32 component in the Field
  let mask: u32 = (1u << length) - 1u;  // Create a mask with 'length' number of 1s
  // Extract the required u32 component and shift it so that the bits we're interested in are at the rightmost position
  let shifted: u32 = x.components[idx] >> bit_pos;
  // Apply the mask to isolate the bits we're interested in
  return shifted & mask;
}

fn mul_point_windowed(p: Point, scalar: Field) -> Point {
  // Pre-computation
  var precomputed: array<Point, 16> = array<Point, 16>();
  precomputed[0] = Point(U256_ZERO, U256_ONE, U256_ZERO, U256_ONE);  // Neutral element
  precomputed[1] = p;
  for (var i: u32 = 2; i < 16; i = i + 1) {
    precomputed[i] = add_points(precomputed[i - 1], p);
  }
  // Initialize result
  var result: Point = Point(U256_ZERO, U256_ONE, U256_ZERO, U256_ONE); // Neutral element
  // Calculate the number of windows
  let num_windows: u32 = (256 + 3) / 4;  // number of bits divided by the window size, rounded up
  // Multiply
  for (var window: u32 = num_windows; window > 0; window = window - 1) {
    result = double_point(double_point(double_point(double_point(result))));  // Double it 4 times
    // Take the next 4 bits from scalar
    let bits: u32 = get_bits(scalar, (window - 1) * 4, 4);
    // Add the corresponding precomputed point
    result = add_points(result, precomputed[bits]);
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