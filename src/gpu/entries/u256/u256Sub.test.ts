import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { u256EntryEvaluationString } from './evalString';
import { FIELD_SIZE } from '../../U32Sizes';

describe('u256Sub', () => {
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
    [BigInt(6), BigInt(4), BigInt(2)],
    [BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041'), BigInt(1), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239040')],
    [BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'), BigInt('1'), BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639934')],
    [BigInt(0), BigInt(0), BigInt(0)],
    [BigInt(9), BigInt(8), BigInt(1)],
    [BigInt(4294967299), BigInt(4294967297), BigInt(2)],
    [BigInt(3458380512), BigInt(3458380512), BigInt(0)],
    [BigInt('28000000000000000000000000000000000000'), BigInt('14000000000000000000000000000000000000'), BigInt('14000000000000000000000000000000000000')],
    [BigInt('18446744073709551616'), BigInt(1), BigInt('18446744073709551615')]
  ])('should subtract uint256 numbers', async (input1: bigint, input2: bigint, expected: bigint) => {
    // need to pass an untyped array here
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input2), individualInputSize: FIELD_SIZE };
    const evalString = u256EntryEvaluationString('u256_sub', [u32Input1, u32Input2]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});