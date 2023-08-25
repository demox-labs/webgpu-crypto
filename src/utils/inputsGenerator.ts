import { generateRandomFields } from "../gpu/utils";
import { FIELD_MODULUS } from "../params/BLS12_377Constants";

export const singleInputGenerator = (inputSize: number): bigint[][] => {
  return [generateRandomFields(inputSize)];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const squaresGenerator = (inputSize: number): bigint[][] => {
  const randomFields = generateRandomFields(inputSize);
  const squaredFields = randomFields.map((field) => (field * field) % FIELD_MODULUS);
  return [squaredFields];
};

const pointScalarGenerator = (inputSize: number): bigint[][] => {
  const groupArr = new Array(inputSize);
  const scalarArr = new Array(inputSize);
  scalarArr.fill(BigInt('303411688971426691737907573487068071512981595762917890905859781721748416598'));
  // known group
  groupArr.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  // const scalarArr = generateRandomFields(inputSize);
  return [groupArr, scalarArr];
};

const doublePointGenerator = (inputSize: number): bigint[][] => {
  const groupArr1 = new Array(inputSize);
  groupArr1.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  const groupArr2 = new Array(inputSize);
  groupArr2.fill(BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'));
  return [groupArr1, groupArr2];
};