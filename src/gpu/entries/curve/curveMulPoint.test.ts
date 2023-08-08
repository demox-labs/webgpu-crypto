import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntToU32Array, bigIntsToU32Array, u32ArrayToBigInts } from '../../utils';

describe('curveMulPoint', () => {
  let browser: Browser;
  beforeAll(async () => {
    browser = await puppeteer.launch({
      // Might need to be configurable at some point. 
      // '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
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
    // resulty: bigint
    ) => {
    // need to pass an untyped array here
    const u32Input1 = Array.from(bigIntsToU32Array([p1x, p1y]));
    const u32Input2 = Array.from(bigIntToU32Array(scalar));
    const result = await ((await browser.pages())[0]).evaluate(`(point_mul)([${u32Input1}], [${u32Input2}])`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntsResult = u32ArrayToBigInts(uint32ArrayResult);

    expect(bigIntsResult[0].toString()).toEqual(resultx.toString());
    // expect(bigIntsResult[1].toString()).toEqual(resulty.toString());
  });
});