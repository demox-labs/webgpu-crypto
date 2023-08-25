import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, bigIntsToU32Array, gpuU32Inputs, gpuU32PuppeteerString, u32ArrayToBigInts } from '../../utils';
import { AFFINE_POINT_SIZE, FIELD_SIZE } from '../../U32Sizes';

describe('curveMulPointWindowed', () => {
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
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('1753533570350686550323082834194063544688355123444645930667634514069517491627'),
      BigInt('5324992470787461040823919570440348586607207885188029730405305593254964962313')
    ],
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('1'),
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246')
    ],
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('2'),
      BigInt('7304662912603109101654342147238231070235863099037011884568440290807776100174')
    ]
  ])('should multiply affine point by scalar', async (
    p1x: bigint,
    p1y: bigint,
    scalar: bigint,
    resultx: bigint,
    ) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntsToU32Array([p1x, p1y]), individualInputSize: AFFINE_POINT_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntToU32Array(scalar), individualInputSize: FIELD_SIZE };
    const result = await ((await browser.pages())[0]).evaluate(`(point_mul_windowed)(${gpuU32PuppeteerString(u32Input1)}, ${gpuU32PuppeteerString(u32Input2)})`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntsResult = u32ArrayToBigInts(uint32ArrayResult);

    expect(bigIntsResult[0].toString()).toEqual(resultx.toString());
  });
});