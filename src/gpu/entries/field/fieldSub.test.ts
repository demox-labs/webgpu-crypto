import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { FIELD_MODULUS } from '../../../params/BLS12_377Constants';
import { CurveType } from '../../params';
import { FIELD_SIZE } from '../../U32Sizes';
import { fieldEntryEvaluationString } from './evalString';

describe('fieldSub', () => {
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
    // should wrap back around
    [BigInt(2), BigInt(4), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239039')],
    // anything minus aleo field order should result in itself
    [BigInt(0), FIELD_MODULUS, BigInt(0)],
    [BigInt(1), FIELD_MODULUS, BigInt(1)],
    [BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040'), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040'), BigInt(0)],
    [BigInt(0), BigInt(0), BigInt(0)],
    [BigInt(9), BigInt(8), BigInt(1)],
    [BigInt(4294967296), BigInt(4294967297), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040')],
    [BigInt(3458380512), BigInt(3458380512), BigInt(0)],
    [BigInt('28000000000000000000000000000000000000'), BigInt('14000000000000000000000000000000000000'), BigInt('14000000000000000000000000000000000000')],
  ])('should sub field numbers and wrap them if necessary', async (input1: bigint, input2: bigint, expected: bigint) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input2), individualInputSize: FIELD_SIZE };
    const evalString = fieldEntryEvaluationString('field_sub', CurveType.BLS12_377, [u32Input1, u32Input2]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});