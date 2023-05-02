import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, u32ArrayToBigInts } from '../utils';

describe('fieldModulusU256GT', () => {
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

  // for ease of testing, using 0s and 1s instead of true and false
  it.each([
    [BigInt(6), BigInt(4), BigInt(1)],
    [BigInt(4), BigInt(6), BigInt(0)],
    [BigInt('115792089237316195423570985008687907853269984665640564039457584007913129639935'), BigInt('1'), BigInt(1)],
    [BigInt(0), BigInt(0), BigInt(0)],
    [BigInt(9), BigInt(8), BigInt(1)],
    [BigInt(4294967299), BigInt(4294967297), BigInt(1)],
    [BigInt(3458380512), BigInt(3458380512), BigInt(0)],
  ])('should compare greater than uint256 numbers', async (input1: bigint, input2: bigint, expected: bigint) => {
    // need to pass an untyped array here
    const u32Input1 = Array.from(bigIntToU32Array(input1));
    const u32Input2 = Array.from(bigIntToU32Array(input2));
    const result = await ((await browser.pages())[0]).evaluate(`(u256_gt)([${u32Input1}], [${u32Input2}])`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});