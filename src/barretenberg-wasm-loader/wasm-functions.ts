import { Barretenberg, Fr, Fq, Point } from '@aztec/bb.js';

export const addFields = async (f1: string, f2: string) => {
  const api = await Barretenberg.new();
  const fr1: Fq = new Fq(BigInt(f1));
  const fr2: Fq = new Fq(BigInt(f2));
  const result = api.addFields(fr1, fr2);
  await api.destroy();
  return [result.toString()];
};

export const bulkAddFields = async (fields1: string[], fields2: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fq = new Fq(BigInt(fields1[i]));
    const fr2: Fq = new Fq(BigInt(fields2[i]));
    const result = await api.addFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkAddFieldsThreaded = async (fields1: string[], fields2: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fq = new Fq(BigInt(fields1[i]));
    const fr2: Fq = new Fq(BigInt(fields2[i]));
    const result = await api.addFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkSubFields = async(fields1: string[], fields2: string[]) => {
  const api = await Barretenberg.new();

  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fq = new Fq(BigInt(fields1[i]));
    const fr2: Fq = new Fq(BigInt(fields2[i]));
    const result = await api.subFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkMulFields = async(fields1: string[], fields2: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fq = new Fq(BigInt(fields1[i]));
    const fr2: Fq = new Fq(BigInt(fields2[i]));
    const result = await api.mulFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkMul2Fields = async(fields1: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields1.length; i++) {
    const fr1: Fq = new Fq(BigInt(fields1[i]));
    const fr2: Fq = new Fq(BigInt(2));
    const result = await api.mulFields(fr1, fr2);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkInvertFields = async(fields: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const fr: Fq = new Fq(BigInt(fields[i]));
    const result = await api.invertField(fr);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkPowFields = async(fieldBases: string[], fieldExps: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fieldBases.length; i++) {
    const frBase: Fq = new Fq(BigInt(fieldBases[i]));
    const frExp: Fq = new Fq(BigInt(fieldExps[i]));
    const result = await api.expField(frBase, frExp);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const bulkPowFields17 = async(fieldBases: string[]) => {
  const api = await Barretenberg.new();
  const fr17 = new Fq(BigInt(17));
  const results: string[] = [];
  for (let i = 0; i < fieldBases.length; i++) {
    const frBase: Fq = new Fq(BigInt(fieldBases[i]));
    const result = await api.expField(frBase, fr17);
    results.push(result.value.toString(10));
  }

  await api.destroy();
  return results;
};

export const bulkSqrtFields = async(fields: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < fields.length; i++) {
    const fr: Fq = new Fq(BigInt(fields[i]));
    const result = await api.sqrtField(fr);
    results.push(result.value.toString(10));
  }
  
  await api.destroy();
  return results;
};

export const randomPolynomial = async (degree: number) => {
  const api = await Barretenberg.new();
  const result = await api.randomPolynomial(2 ** degree);
  await api.destroy();
  return result;
}

export const ntt_single_threaded = async (polynomialCoefficients: string[]) => {
  const api = await Barretenberg.new(1);
  const evaluationDomain = await api.newEvaluationDomain(polynomialCoefficients.length);
  const polyCoeffs = polynomialCoefficients.map((c) => new Fr(BigInt(c)));
  const result = await api.fft(polyCoeffs, evaluationDomain);

  await api.destroy();
  return result.map((r: any) => r.value.toString());
}

export const ntt = async (polynomialCoefficients: string[]) => {
  const api = await Barretenberg.new();
  const evaluationDomain = await api.newEvaluationDomain(polynomialCoefficients.length);
  const polyCoeffs = polynomialCoefficients.map((c) => new Fr(BigInt(c)));
  const result = await api.fft(polyCoeffs, evaluationDomain);

  await api.destroy();
  return result.map((r: any) => r.value.toString());
}

export interface bbPoint {
  x: string,
  y: string,
}

export const bulkGenerateRandomPoints = async (numPoints: number) => {
  const api = await Barretenberg.new();
  const points: bbPoint[] = [];
  for (let i = 0; i < numPoints; i++) {
    const point = await api.randomPoint();
    points.push({ x: point.x.value.toString(10), y: point.y.value.toString(10) });
  }

  return points;
};

export const bulkGenerateConstantPoint = async (numPoints: number) => {
  const points = new Array(numPoints);
  const constPoint = { x: "9488384720951639809707572357479649241125593886843713801844655093259905475658", y: "16159185574012703085953752536106955829175932087014915348648613830635631153829" };
  return points.fill(constPoint);
}

export const bulkAddPoints = async (points1: bbPoint[], points2: bbPoint[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  for (let i = 0; i < points1.length; i++) {
    const point1X = new Fq(BigInt(points1[i].x));
    const point1Y = new Fq(BigInt(points1[i].y));
    const point2X = new Fq(BigInt(points2[i].x));
    const point2Y = new Fq(BigInt(points2[i].y));
    const [resultX, resultY] = await api.addPoints(point1X, point1Y, point2X, point2Y);
    results.push(resultX.value.toString(10));
  }

  await api.destroy();

  return results;
};

export const bulkDoublePoints = async (points1: bbPoint[]): Promise<string[]> => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  const allResults: any[] = [];
  for (let i = 0; i < points1.length; i++) {
    const point1X = new Fq(BigInt(points1[i].x));
    const point1Y = new Fq(BigInt(points1[i].y));
    const [resultX, resultY] = await api.doublePoint(point1X, point1Y);
    results.push(resultX.value.toString(10));
  }

  await api.destroy();

  return results;
};

export const bulkMulPoints = async (points1: bbPoint[], scalars: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  // const x = new Fq(BigInt('9488384720951639809707572357479649241125593886843713801844655093259905475658'));
  // const y = new Fq(BigInt('16159185574012703085953752536106955829175932087014915348648613830635631153829'))
  // const point = new Point(x, y);
  // const scalar = new Fr(BigInt('886568852500438792437990774500261955780191638273449720129821949540731274186'));
  // const [resultX, resultY] = await api.pointScalar(point, scalar);
  
  for (let i = 0; i < points1.length; i++) {
    const point = new Point(new Fq(BigInt(points1[i].x)), new Fq(BigInt(points1[i].y)))
    const scalar = new Fr(BigInt(scalars[i]));
    const [resultX, resultY] = await api.pointScalar(point, scalar);
    results.push(resultX.value.toString(10));
  }

  await api.destroy();

  return results;
}

export const bulkMulPointsMultiThreaded = async (points1: bbPoint[], scalars: string[]) => {
  const api = await Barretenberg.new();
  const results: string[] = [];
  // const x = new Fq(BigInt('9488384720951639809707572357479649241125593886843713801844655093259905475658'));
  // const y = new Fq(BigInt('16159185574012703085953752536106955829175932087014915348648613830635631153829'))
  // const point = new Point(x, y);
  // const scalar = new Fr(BigInt('886568852500438792437990774500261955780191638273449720129821949540731274186'));
  // const [resultX, resultY] = await api.pointScalar(point, scalar);
  
  for (let i = 0; i < points1.length; i++) {
    const point = new Point(new Fq(BigInt(points1[i].x)), new Fq(BigInt(points1[i].y)))
    const scalar = new Fr(BigInt(scalars[i]));
    const [resultX, resultY] = await api.pointScalar(point, scalar);
    results.push(resultX.value.toString(10));
  }

  await api.destroy();

  return results;
}

export const naive_msm_single_threaded = async (points: bbPoint[], scalars: string[]): Promise<string[]> => {
  const api = await Barretenberg.new(1);
  const apiPoints = points.map((p) => { return new Point(new Fq(BigInt(p.x)), new Fq(BigInt(p.y))) });
  const apiScalars = scalars.map((s) => { return new Fr(BigInt(s)) });
  const [resultX, resultY] = await api.naiveMsm(apiPoints, apiScalars);

  await api.destroy();
  return [resultX.value.toString(10)];
};

export const naive_msm = async (points: bbPoint[], scalars: string[]): Promise<string[]> => {
  const api = await Barretenberg.new();
  const apiPoints = points.map((p) => { return new Point(new Fq(BigInt(p.x)), new Fq(BigInt(p.y))) });
  const apiScalars = scalars.map((s) => { return new Fr(BigInt(s)) });
  const [resultX, resultY] = await api.naiveMsm(apiPoints, apiScalars);

  await api.destroy();
  return [resultX.value.toString(10)];
};

export const pippenger_msm = async (points: bbPoint[], scalars: string[]): Promise<string[]> => {
  const api = await Barretenberg.new();
  const apiPoints = points.map((p) => { return new Point(new Fq(BigInt(p.x)), new Fq(BigInt(p.y))) });
  const apiScalars = scalars.map((s) => { return new Fr(BigInt(s)) });
  const [resultX, resultY] = await api.pippengerMsm(apiPoints, apiScalars);
  return [resultX.value.toString(10)];
};

export const pippenger_msm_single_threaded = async (points: bbPoint[], scalars: string[]): Promise<string[]> => {
  const api = await Barretenberg.new(1);
  const apiPoints = points.map((p) => { return new Point(new Fq(BigInt(p.x)), new Fq(BigInt(p.y))) });
  const apiScalars = scalars.map((s) => { return new Fr(BigInt(s)) });
  const [resultX, resultY] = await api.pippengerMsm(apiPoints, apiScalars);

  await api.destroy();
  return [resultX.value.toString(10)];
};
