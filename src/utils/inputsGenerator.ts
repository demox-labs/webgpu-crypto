import { ExtPointType } from "@noble/curves/abstract/edwards";
import { bn254 } from "@noble/curves/bn254";
import { bbPoint, bulkGenerateConstantPoint } from "../barretenberg-wasm-loader/wasm-functions";
import { CurveType, getModulus } from "../gpu/curveSpecific";
import { AFFINE_POINT_SIZE, FIELD_SIZE } from "../gpu/U32Sizes";
import { bigIntToU32Array, bigIntsToU16Array, bigIntsToU32Array, generateRandomFields, generateRandomScalars, gpuU32Inputs, stripFieldSuffix } from "../gpu/utils";
import { aleoMdStrings, aleoRoundConstantStrings } from "../params/AleoPoseidonParams";
import { convertBytesToFieldElement, convertCiphertextToDataView, getNonce, getPrivateOwnerBytes } from "../parsers/aleo/RecordParser";
import { FieldMath } from "./BLS12_377FieldMath";

export const singleInputGenerator = (inputSize: number, curve: CurveType): bigint[][] => {
  return [generateRandomFields(inputSize, curve)];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const squaresGenerator = (inputSize: number, curve: CurveType): bigint[][] => {
  const randomFields = generateRandomFields(inputSize, curve);
  const squaredFields = randomFields.map((field) => (field * field) % getModulus(curve));
  return [squaredFields];
};

// Note: For now this will generate random scalars, but generate the same point
// for the inputs. This point is a known point on the curve.
export const pointScalarGenerator = async (inputSize: number, curve: CurveType): Promise<any[][]> => {
  switch (curve) {
    case CurveType.BLS12_377:
      const groupArr = new Array(inputSize);
      groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
      const scalarArr = generateRandomScalars(inputSize, curve);
      return [groupArr, scalarArr];
    case CurveType.BN254:
      return [(await singlePointGenerator(inputSize, curve))[0], generateRandomScalars(inputSize, curve)];
    default:
      throw new Error('Invalid curve type');
  }
};

export const doublePointGenerator = async (inputSize: number, curve: CurveType): Promise<any[][]> => {
  return [(await singlePointGenerator(inputSize, curve))[0], (await singlePointGenerator(inputSize, curve))[0]];
};

export const singlePointGenerator = async (inputSize: number, curve: CurveType): Promise<any[][]> => {
  switch (curve) {
    case CurveType.BLS12_377:
      const groupArr1 = new Array(inputSize);
      groupArr1.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
      return [groupArr1];
    case CurveType.BN254:
      return [await bulkGenerateConstantPoint(inputSize)];
    default:
      throw new Error('Invalid curve type');
      break;
  }
};

export const ownerViewKey = "AViewKey1dS9uE4XrARX3m5QUDWSrqmUwxY3PFKVdMvPwzbtbYrUh";
const ownerViewKeyScalar = BigInt('1047782004112991658538528321810337177976429471185056028001320450422875039246');
const ownerAddress_x = BigInt('7090760734045932545891632488445252924506076885393655832444210322936011804429');
const ciphertext = "record1qyqspf8z9eekgc5n8y0crj888m0ntz84psy3mrvhfp9sy2ea462em9qpqgqkzscqqgpqq5q752ylzzgduf0umw4hqafac3d6ev66feeydq4yqu9cj0e5ynqwhskrr53e4y2a3tazl7vfp94rczxzreqmxs6e4lsuvl2hu470myxqzcjrqqpqyqxyxjxxlp0a6m25sma5vgjn49ztqf3wvu0cx09q3ptjf59k4aarz9sl3flmy4lxsejs46h3nhrtap4m4tn3sck3lydeldlhfyg50vqslc83g4w0qmgepzdv5du8dyu0x2vq23j6w6f427qwhwfeewk8qagy4pgcyl";

export const cipherTextsGenerator = (inputSize: number): string[][] => {
  const cipherTextArr = new Array(inputSize);
  cipherTextArr.fill(ciphertext);
  return [cipherTextArr];
};

export const gpuCipherTextInputConverter = (inputs: string[][]): gpuU32Inputs[] => {
  const cipherTexts = inputs[0];
  const dataViews = cipherTexts.map((ct) => convertCiphertextToDataView(ct));
  const owner_fields = dataViews.map((dv) => BigInt(convertBytesToFieldElement(getPrivateOwnerBytes(dv))));
  const x_coords = dataViews.map(dv => getNonce(dv));
  const fieldMath = new FieldMath();
  const y_coords_map = new Map<bigint, bigint>();
  const y_coords = x_coords.map((x) => {
    const known_y = y_coords_map.get(x);
    const y = known_y ?? fieldMath.getPointFromX(x).y;
    y_coords_map.set(x, y);
    return y;
  });
  const point_inputs = x_coords.map((x, i) => [x, y_coords[i]]).flat();

  const aleoMds = aleoMdStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  const aleoRoundConstants = aleoRoundConstantStrings.map((arr) => arr.map((str) => BigInt(str))).flat();

  return [
    { u32Inputs: bigIntsToU32Array(point_inputs), individualInputSize: AFFINE_POINT_SIZE },
    { u32Inputs: bigIntsToU32Array(owner_fields), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntsToU32Array(aleoMds), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntsToU32Array(aleoRoundConstants), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntToU32Array(ownerViewKeyScalar), individualInputSize: FIELD_SIZE },
    { u32Inputs: bigIntToU32Array(ownerAddress_x), individualInputSize: FIELD_SIZE }
  ];
};

export const gpuSquaresResultConverter = (results: bigint[], curve: CurveType): string[] => {
  return results.map((result) => (result * result % getModulus(curve)).toString());
}

export const bls12_377WasmSquaresResultConverter = (results: string[]): string[] => {
  const bigIntResults = wasmFieldResultConverter(results).map((result) => BigInt(result));
  return bigIntResults.map((result) => (result * result % getModulus(CurveType.BLS12_377)).toString());
}

export const bn254WasmSquaresResultConverter = (results: string[]): string[] => {
  const bigIntResults = results.map((result) => BigInt(result));
  return bigIntResults.map((result) => (result * result % getModulus(CurveType.BN254)).toString());
}

export const poseidonGenerator = (inputSize: number, curve: CurveType): bigint[][] => {
  const firstInput = generateRandomFields(inputSize, curve);
  const secondInput = aleoMdStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  const thirdInput = aleoRoundConstantStrings.map((arr) => arr.map((str) => BigInt(str))).flat();
  return [firstInput, secondInput, thirdInput];
};

export const doubleInputGenerator = (inputSize: number, curve: CurveType): bigint[][] => {
  const firstInput = generateRandomFields(inputSize, curve);
  const secondInput = generateRandomFields(inputSize, curve);
  return [firstInput, secondInput];
};

export const gpuFieldInputConverter = (inputs: bigint[][]): gpuU32Inputs[] => {
  return inputs.map(input => { return { u32Inputs: bigIntsToU32Array(input), individualInputSize: FIELD_SIZE } });
};

export const gpuPointScalarInputConverter = (inputs: any[][], curve: CurveType): gpuU32Inputs[] => {
  switch (curve) {
    case CurveType.BLS12_377:
      const x_coords = inputs[0];
      const fieldMath = new FieldMath();
      const y_coords_map = new Map<bigint, bigint>();
      const y_coords = x_coords.map((x) => {
        const known_y = y_coords_map.get(x);
        const y = known_y ?? fieldMath.getPointFromX(x).y;
        y_coords_map.set(x, y);
        return y;
      });
      const point_inputs = x_coords.map((x, i) => [x, y_coords[i]]).flat();

      return [
        { u32Inputs: bigIntsToU32Array(point_inputs), individualInputSize: AFFINE_POINT_SIZE },
        { u32Inputs: bigIntsToU32Array(inputs[1]), individualInputSize: FIELD_SIZE }
      ];
    case CurveType.BN254:
      return [
        bn254PointsGPUInputConverter([inputs[0] as bbPoint[]])[0],
        { u32Inputs: bigIntsToU32Array(inputs[1]), individualInputSize: FIELD_SIZE }
      ];
    default:
      throw new Error('Invalid curve type');
    }
};

export const bn254PointsGPUInputConverter = (inputs: bbPoint[][]): gpuU32Inputs[] => {
  const gpuInputs: gpuU32Inputs[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const pointsArray = inputs[i];
    const flatBigInts = pointsArray.map((point) => [BigInt(point.x), BigInt(point.y)]).flat();
    gpuInputs.push({ u32Inputs: bigIntsToU32Array(flatBigInts), individualInputSize: AFFINE_POINT_SIZE });
  }

  return gpuInputs;
};

export const gpuPointsInputConverter = (inputs: bigint[][]): gpuU32Inputs[] => {
  const fieldMath = new FieldMath();
  const y_coords_map = new Map<bigint, bigint>();

  for (let i = 0; i < inputs.length; i++) {
    const x = inputs[i][0];
    const known_y = y_coords_map.get(x);
    const y = known_y ?? fieldMath.getPointFromX(x).y;
    y_coords_map.set(x, y);
  }

  const pointInputs: bigint[][] = [];
  for (let i = 0; i < inputs.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pointInputs[i] = inputs[i].map(x_coord => [x_coord, y_coords_map.get(x_coord)!]).flat();
  }

  return pointInputs.map((input) => { return { u32Inputs: bigIntsToU32Array(input), individualInputSize: AFFINE_POINT_SIZE }});
}

// After instantiating the FieldMath object here, it needs to be passed anywhere we need to
// use the field math library to do operations (like add or multiply) on these points.
// Was seeing a "Point is not instance of Point" error otherwise.
export const pippengerGpuInputConverter = (curve: CurveType, scalars: bigint[]): [ExtPointType[], number[], FieldMath] => {
  switch (curve) {
    case CurveType.BLS12_377:
      const fieldMath = new FieldMath();
      const pointsArr = new Array(scalars.length);
      const x = BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246');
      const y = BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166');
      const t = BigInt('3446088593515175914550487355059397868296219355049460558182099906777968652023');
      const z = BigInt('1');
      const extPoint = fieldMath.createPoint(x, y , t, z);
      return [pointsArr.fill(extPoint), Array.from(bigIntsToU16Array(scalars)), fieldMath];
    case CurveType.BN254:
      const point = new bn254.G1.ProjectivePoint(BigInt("9488384720951639809707572357479649241125593886843713801844655093259905475658"), BigInt("16159185574012703085953752536106955829175932087014915348648613830635631153829"), 1n);
      const points = new Array(scalars.length);
      return [points.fill(point), Array.from(bigIntsToU16Array(scalars)), new FieldMath()];
    default:
      throw new Error('Invalid curve type');
    }
};

export const wasmFieldResultConverter = (results: string[]): string[] => {
  return results.map((result) => stripFieldSuffix(result));
};

export const wasmBigIntToFieldConverter = (inputs: bigint[][]): string[][] => {
  return inputs.map((input) => input.map((field) => `${field}field`));
};

export const wasmPointMulConverter = (inputs: bigint[][]): string[][] => {
  const groups = inputs[0].map((input) => `${input}group`);
  const scalars = inputs[1].map((input) => `${input}scalar`);
  return [groups, scalars];
};

export const wasmPointConverter = (inputs: bigint[][]): string[][] => {
  return inputs.map((input) => input.map((group) => `${group}group`));
};

