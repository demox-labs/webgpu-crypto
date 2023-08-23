import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, u32ArrayToBigInts } from '../../utils';

describe('fieldInverse', () => {
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
    [BigInt('123'), BigInt('7140032698703662797738843850677079994008890494764411691912717718824476104555')],
    [BigInt('7140032698703662797738843850677079994008890494764411691912717718824476104555'), BigInt('123')],
    [BigInt('9823798737'), BigInt('7721785495925626920722707159254091218258581972178005996743736554530544917209')],
  ])('should add invert input field elements', async (input1: bigint, expected: bigint) => {
    // need to pass an untyped array here
    const u32Input1 = Array.from(bigIntToU32Array(input1));
    const result = await ((await browser.pages())[0]).evaluate(`(field_inverse)([${u32Input1}])`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntResult = u32ArrayToBigInts(uint32ArrayResult)[0];

    expect(bigIntResult.toString()).toEqual(expected.toString());
  });
});