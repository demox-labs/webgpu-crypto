export class U32 {
  private value: number;

  constructor(input: number | BigInt) {
    if (typeof input === 'number') {
      // Truncate the decimal part
      input = Math.trunc(input);
      // Wrap around to fit into 32 bits
      this.value = input >>> 0;
    } else if (typeof input === 'bigint') {
      // Wrap around to fit into 32 bits
      this.value = Number(input % BigInt(2 ** 32));
    } else {
      throw new Error('Invalid type for U32');
    }
  }

  // Getter to retrieve the value
  get(): number {
    return this.value;
  }

  // Setter to update the value
  set(newValue: number | BigInt): void {
    if (typeof newValue === 'number') {
      // Truncate the decimal part
      newValue = Math.trunc(newValue);
      // Wrap around to fit into 32 bits
      this.value = newValue >>> 0;
    } else if (typeof newValue === 'bigint') {
      // Wrap around to fit into 32 bits
      this.value = Number(newValue % BigInt(2 ** 32));
    } else {
      throw new Error('Invalid type for U32');
    }
  }

  // Addition
  add(other: U32): U32 {
    return new U32(this.get() + other.get());
  }

  // Subtraction
  sub(other: U32): U32 {
    return new U32(this.get() - other.get());
  }

  // Multiplication
  mul(other: U32): U32 {
    return new U32(this.get() * other.get());
  }

  // Division
  div(other: U32): U32 {
    if (other.get() === 0) {
      throw new Error('Division by zero');
    }
    return new U32(Math.floor(this.get() / other.get()));
  }
}

export function calculateMultCarry(a: number, b: number): number {
  // Break a and b into 16-bit halves
  const aLow = a & 0xFFFF;
  const aHigh = a >>> 16;
  const bLow = b & 0xFFFF;
  const bHigh = b >>> 16;

  // Multiply the low 16 bits of a and b
  const lowProduct = aLow * bLow;

  // Multiply the high 16 bits of a and b
  const highProduct = aHigh * bHigh;

  // Calculate the carry
  const carry = highProduct + ((lowProduct >>> 16) + aLow * bHigh + aHigh * bLow >>> 16);

  return carry;
}

export function calculateAdditionCarry(a: number, b: number): number {
  const sum = a + b;
  
  // Check for carry
  const carry = (sum < a || sum < b) ? 1 : 0;
  
  return carry;
}

type U32Array = U32[];

// Multiplies two U32Arrays of any length.
// Returns a U32Array whose length is the sum of the lengths of the input arrays.
function multiplyArbitraryLength(a: U32Array, b: U32Array): U32Array {
  const resultLength = a.length + b.length;
  const result: U32Array = new Array(resultLength).fill(0);
  
  for (let i = 0; i < a.length; i++) {
    let carry = new U32(0);
    for (let j = 0; j < b.length; j++) {
      const temp = a[i].mul(b[j]).add(result[i+j]).add(carry);
      result[i + j] = temp;
      carry = temp.div(new U32(0x100000000));  // Extract carry
    }
    result[i + b.length] =result[i + b.length].add(carry);
  }
  
  return result;
}

export function compareU32Arrays(a: U32[], b: U32[], bigEndian: boolean = false): number {
  // Make sure both arrays have the same length by padding with zeros if needed
  const maxLength = Math.max(a.length, b.length);
  const aPadded = Array(maxLength - a.length).fill(0).concat(a);
  const bPadded = Array(maxLength - b.length).fill(0).concat(b);

  const iterStart = bigEndian ? 0 : maxLength - 1;
  const iterEnd = bigEndian ? maxLength - 1 : 0;

  // Compare arrays element by element, starting from the most significant
  for (let i of rangeBetween(iterStart, iterEnd)) {
    if (aPadded[i] > bPadded[i]) {
      return 1;
    } else if (aPadded[i] < bPadded[i]) {
      return -1;
    }
  }

  // If we reach this point, the arrays are equal
  return 0;
}

// Adds two U32Arrays of arbitrary length.
// Returns a new U32Array representing the sum.
export function addU32Arrays(a: U32[], b: U32[], bigEndian = false): U32Array {
  const maxLength = Math.max(a.length, b.length);
  const result: U32Array = new Array(maxLength).fill(0);
  let carry = 0;

  const iterStart = bigEndian ? maxLength - 1 : 0;
  const iterEnd = bigEndian ? 0 : maxLength - 1;

  for (let i of rangeBetween(iterStart, iterEnd)) {
    const sum = (a[i].get() || 0) + (b[i].get() || 0) + carry;
    result[i] = new U32(sum >>> 0);  // Truncate to 32 bits
    carry = sum < a[i].get() || sum < b[i].get() ? 1 : 0;  // Check for carry
  }

  if (carry > 0) {
    result.push(new U32(carry));
  }

  return result;
}

// Subtracts two U32Arrays of arbitrary length.
// Returns a new U32Array representing the difference.
export function subtractU32Arrays(a: U32Array, b: U32Array, bigEndian = false): U32Array {
  const maxLength = Math.max(a.length, b.length);
  const result: U32Array = new Array(maxLength).fill(0);
  let borrow = 0;

  const iterStart = bigEndian ? maxLength - 1 : 0;
  const iterEnd = bigEndian ? 0 : maxLength - 1;

  for (let i of rangeBetween(iterStart, iterEnd)) {
    const diff = (a[i].get() || 0) - (b[i].get() || 0) - borrow;
    result[i] = new U32(diff >>> 0);  // Truncate to 32 bits
    borrow = diff < 0 ? 1 : 0;  // Check for borrow
  }

  // Remove leading zeros from the result
  while (result.length > 1 && result[result.length - 1].get() === 0) {
    result.pop();
  }

  return result;
}

// Inclusive on both ends
function rangeBetween(a: number, b: number): number[] {
  const result: number[] = [];
  const step = a <= b ? 1 : -1;

  for (let i = a; step > 0 ? i <= b : i >= b; i += step) {
    result.push(i);
  }

  return result;
}