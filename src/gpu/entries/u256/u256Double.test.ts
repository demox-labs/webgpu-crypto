import puppeteer from "puppeteer";
import { Browser } from "puppeteer";
import { bigIntToU32Array, u32ArrayToBigInts } from "../../utils";
import { u256EntryEvaluationString } from "./evalString";
import { FIELD_SIZE } from "../../U32Sizes";

describe("u256Double", () => {
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
    [BigInt(2), BigInt(4)],
    [BigInt(0), BigInt(0)],
    [BigInt(1), BigInt(2)],
    [BigInt(2147483648), BigInt(4294967296)],
    [BigInt('9223372036854775808'), BigInt('18446744073709551616')],
    [BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819968'), BigInt(0)],
    [BigInt('57896044618658097711785492504343953926634992332820282019728792003956564819969'), BigInt(2)]
  ])('should double the uint256', async (input1: bigint, expected: bigint) => {
    const u32Input1 = { u32Inputs: bigIntToU32Array(input1), individualInputSize: FIELD_SIZE };

    const evalString = u256EntryEvaluationString('u256_double', [u32Input1]);
    const result = await ((await browser.pages())[0]).evaluate(evalString);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});