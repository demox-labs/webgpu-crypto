import { newBarretenbergApiSync } from "./dest/browser";
import { Fr } from "./dest/browser/types";

export const addFields = async (f1: string, f2: string) => {
  const api = await newBarretenbergApiSync();
  const fr1: Fr = new Fr(BigInt(f1));
  const fr2: Fr = new Fr(BigInt(f2));
  const result = await api.addFields(fr1, fr2);
  await api.destroy();
  return [result.toString()];
};

export const bulkAddFields = async (fields1: string[], fields2: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fr = new Fr(BigInt(fields1[i]));
    const fr2: Fr = new Fr(BigInt(fields2[i]));
    const result = await api.addFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkSubFields = async(fields1: string[], fields2: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fr = new Fr(BigInt(fields1[i]));
    const fr2: Fr = new Fr(BigInt(fields2[i]));
    const result = await api.subFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkMulFields = async(fields1: string[], fields2: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fr = new Fr(BigInt(fields1[i]));
    const fr2: Fr = new Fr(BigInt(fields2[i]));
    const result = await api.mulFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkInvertFields = async(fields: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const fr: Fr = new Fr(BigInt(fields[i]));
    const result = await api.invertField(fr);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkPowFields = async(fieldBases: string[], fieldExps: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fieldBases.length; i++) {
    const frBase: Fr = new Fr(BigInt(fieldBases[i]));
    const frExp: Fr = new Fr(BigInt(fieldExps[i]));
    const result = await api.expField(frBase, frExp);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkPowFields17 = async(fieldBases: string[]) => {
  const api = await newBarretenbergApiSync();
  const fr17 = new Fr(BigInt(17));
  const results: string[] = [];
  for (let i = 0; i < fieldBases.length; i++) {
    const frBase: Fr = new Fr(BigInt(fieldBases[i]));
    const result = await api.expField(frBase, fr17);
    results.push(result.value.toString(10));
  }

  await api.destroy();
  return results;
};

export const bulkSqrtFields = async(fields: string[]) => {
  const api = await newBarretenbergApiSync();
  const results: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const fr: Fr = new Fr(BigInt(fields[i]));
    const result = await api.sqrtField(fr);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const randomPolynomial = async (degree: number) => {
  const api = await newBarretenbergApiSync();
  const result = api.randomPolynomial(2 ** degree);
  await api.destroy();
  return result;
}

export const ntt = async (polynomialCoefficients: string[]) => {
  const api = await newBarretenbergApiSync();
  const evaluationDomain = api.newEvaluationDomain(polynomialCoefficients.length);
  const polyCoeffs = polynomialCoefficients.map((c) => new Fr(BigInt(c)));
  const result = api.fft(polyCoeffs, evaluationDomain);

  await api.destroy();
  return result.map((r) => r.value.toString());
}