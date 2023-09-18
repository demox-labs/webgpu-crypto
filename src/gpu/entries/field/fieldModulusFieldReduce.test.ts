import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { FIELD_MODULUS } from '../../../params/BLS12_377Constants';
import { fieldEntryEvaluationString } from './evalString';
import { CurveType } from '../../curveSpecific';
import { FIELD_SIZE } from '../../U32Sizes';

describe('fieldModulusReduce', () => {
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
    [BigInt(2), BigInt(2)],
    [FIELD_MODULUS, BigInt(0)],
    [BigInt('16888923498856740848497649877563093062751798670308127655870466911834818478081'), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040')],
    [BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239042'), BigInt(1)],
    [BigInt('120398457102983457029138745023987'), BigInt('120398457102983457029138745023987')]
  ])('should add reduce big ints into field elements', async (input1: bigint, expected: bigint) => {
    // need to pass an untyped array here
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const evalString = fieldEntryEvaluationString('field_reduce', CurveType.BLS12_377, [u32Input1]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});