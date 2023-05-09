import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, u32ArrayToBigInts } from '../utils';
import { ALEO_FIELD_MODULUS } from '../../params/AleoConstants';

describe('fieldModulusU256Multiply', () => {
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
    [BigInt(2), BigInt(4), BigInt(16)],
    [BigInt(1), BigInt(0), BigInt(1)],
    [BigInt(9), BigInt(8), BigInt('43046721')],
    [BigInt(15000), BigInt(2), BigInt('225000000')],
  ])('should do field exponentiation', async (input1: bigint, input2: bigint, expected: bigint) => {
    const u32Input1 = Array.from(bigIntToU32Array(input1));
    const u32Input2 = Array.from(bigIntToU32Array(input2));
    const result = await ((await browser.pages())[0]).evaluate(`(field_exponentiation)([${u32Input1}], [${u32Input2}])`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});