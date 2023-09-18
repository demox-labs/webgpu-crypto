import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { CurveType } from '../../curveSpecific';
import { fieldEntryEvaluationString } from './evalString';
import { FIELD_SIZE } from '../../U32Sizes';

describe('fieldModulusExponentiation', () => {
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
    [BigInt(25), BigInt('60001509534603559531609739528203892656505753216962260608619555'), BigInt('2162778637144600773838902968767688614233520848441049636087321895557933046729')],
    [BigInt(25), BigInt('30000754767301779765804869764101946328252876608481130304309778'), BigInt('2774790624473817237320672554055090979281590950368967309207911707712866578499')]
  ])('should do field exponentiation', async (input1: bigint, input2: bigint, expected: bigint) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input2), individualInputSize: FIELD_SIZE };
    const evalString = fieldEntryEvaluationString('field_pow', CurveType.BLS12_377, [u32Input1, u32Input2]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});