import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, gpuU32Inputs, u32ArrayToBigInts } from '../../utils';
import { fieldEntryEvaluationString } from './evalString';
import { CurveType } from '../../params';
import { FIELD_SIZE } from '../../U32Sizes';

describe('fieldSqrt', () => {
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
    [BigInt(4), BigInt(2)],
    [BigInt(9), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239038')],
    [BigInt(25), BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239036')],
    [BigInt('9657672915538583998542678820329009'), BigInt('8444461749428370424248824938781546531375899335154063827935135182457535585544')]
  ])('should find the square root of numbers', async (input1: bigint, expected: bigint) => {
    // need to pass an untyped array here
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };
    const evalString = fieldEntryEvaluationString('field_sqrt', CurveType.BLS12_377, [u32Input1]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});