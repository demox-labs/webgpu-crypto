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
    [BigInt(2), BigInt(4), BigInt(8)],
    [BigInt('17684216722439012352'), BigInt('13072530704011624448'), BigInt('231177466080479803996665978540257181696')],
    [(ALEO_FIELD_MODULUS / BigInt(2)), BigInt(2), ALEO_FIELD_MODULUS - BigInt(1)],
    [ALEO_FIELD_MODULUS, BigInt(0), BigInt(0)],
    [ALEO_FIELD_MODULUS, BigInt(2), BigInt(0)],
    [ALEO_FIELD_MODULUS, ALEO_FIELD_MODULUS, BigInt(0)],
    [ALEO_FIELD_MODULUS + BigInt(2), BigInt(2), BigInt(4)],
    [BigInt('542101086242752217003726400434970855712890625'), BigInt('542101086242752217003726400434970855712890625'), BigInt('4049876799198613235662808409310909745689267379541545003864313481035049862036')]
  ])('should multiply uint256 field numbers', async (input1: bigint, input2: bigint, expected: bigint) => {
    const u32Input1 = Array.from(bigIntToU32Array(input1));
    const u32Input2 = Array.from(bigIntToU32Array(input2));
    const result = await ((await browser.pages())[0]).evaluate(`(field_multiply)([${u32Input1}], [${u32Input2}])`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});