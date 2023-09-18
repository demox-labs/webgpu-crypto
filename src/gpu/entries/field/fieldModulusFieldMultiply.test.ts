import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { FIELD_MODULUS } from '../../../params/BLS12_377Constants';
import { fieldEntryEvaluationString } from './evalString';
import { CurveType } from '../../curveSpecific';
import { FIELD_SIZE } from '../../U32Sizes';

describe('u256Multiply', () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      executablePath: '/Applications/Google\ Chrome\ Beta.app/Contents/MacOS/Google\ Chrome\ Beta',
      devtools: true,
      headless: false,
      args: ['#enable-webgpu-developer-features']
    });

    const page = (await browser.pages())[0];
    await page.goto("http://localhost:4000");
  });

  afterAll(async () => {
    await browser.close();
  });

  it.each([
    [BigInt(2), BigInt(4), BigInt(8)],
    [BigInt('17684216722439012352'), BigInt('13072530704011624448'), BigInt('231177466080479803996665978540257181696')],
    [(FIELD_MODULUS / BigInt(2)), BigInt(2), FIELD_MODULUS - BigInt(1)],
    [FIELD_MODULUS, BigInt(0), BigInt(0)],
    [FIELD_MODULUS, BigInt(2), BigInt(0)],
    [FIELD_MODULUS, FIELD_MODULUS, BigInt(0)],
    [FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
    [BigInt('542101086242752217003726400434970855712890625'), BigInt('542101086242752217003726400434970855712890625'), BigInt('4049876799198613235662808409310909745689267379541545003864313481035049862036')]
  ])('should multiply uint256 field numbers', async (input1: bigint, input2: bigint, expected: bigint) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input2), individualInputSize: FIELD_SIZE };
    const evalString = fieldEntryEvaluationString('field_multiply', CurveType.BLS12_377, [u32Input1, u32Input2]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});