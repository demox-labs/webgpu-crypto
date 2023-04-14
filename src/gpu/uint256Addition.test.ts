import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { bigIntToU32Array, u32ArrayToBigInts } from './utils';

describe('uint256Addition', () => {
  let browser: Browser;
  beforeAll(async () => {
    jest.setTimeout(60_000);

    browser = await puppeteer.launch({
      executablePath: '/Applications/Google\ Chrome\ Beta.app/Contents/MacOS/Google\ Chrome\ Beta',
      devtools: true,
      headless: false,
      args: ['#enable-webgpu-developer-features']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  it.each([
    [BigInt(0), BigInt(0), BigInt(0)],
    [BigInt(1), BigInt(8), BigInt(9)],
    [BigInt(4294967297), BigInt(4294967297), BigInt(8589934594)],
    // [BigInt('14000000000000000000000000000000000000'), BigInt('14000000000000000000000000000000000000'), BigInt('28000000000000000000000000000000000000')]
  ])('should add uint256 numbers', async (input1: bigint, input2: bigint, expected: bigint) => {
    const externalFunctionFilePath = path.resolve('./src/gpu/uint256Addition.ts');
    const fileContent = await fs.readFile(externalFunctionFilePath, 'utf-8');

    // Extract the function string
    const functionStringMatch = fileContent.match(/async function actualUint256Addition[^{]*\{[\s\S]*?(?<=^|\n)\}/m);
    const functionString = functionStringMatch && functionStringMatch[0];
    // need to pass an untyped array here
    const u32Input1 = Array.from(bigIntToU32Array(input1));
    const u32Input2 = Array.from(bigIntToU32Array(input2));
    const result = await ((await browser.pages())[0]).evaluate(`(${functionString})([${u32Input1}], [${u32Input2}])`) as Uint32Array;
    const bigIntResult = u32ArrayToBigInts(result)[0];
    console.log(bigIntResult);
    // await new Promise(r => setTimeout(r, 45_000));
    // await browser.close();

    expect(bigIntResult).toEqual(expected);
  });
});