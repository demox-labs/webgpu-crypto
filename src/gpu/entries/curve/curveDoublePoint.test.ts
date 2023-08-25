import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntsToU32Array, gpuU32Inputs, gpuU32PuppeteerString, u32ArrayToBigInts } from '../../utils';
import { AFFINE_POINT_SIZE } from '../../U32Sizes';

describe('curveDoublePoints', () => {
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
      BigInt('7567318425042049695485063481352884626263173541493743764753928133860027560480'),
      BigInt('6153410899968666564625001831730219854362172909505947924193488412955254022111'),
      BigInt('5042473777803417606579440401406822102329732371743950988738806767808616709467'),
    ],
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('7304662912603109101654342147238231070235863099037011884568440290807776100174')
    ]
  ])('should double affine points', async (
    p1x: bigint,
    p1y: bigint,
    resultx: bigint,
    ) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntsToU32Array([p1x, p1y]), individualInputSize: AFFINE_POINT_SIZE };
    const result = await ((await browser.pages())[0]).evaluate(`(point_double)(${gpuU32PuppeteerString(u32Input1)})`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntsResult = u32ArrayToBigInts(uint32ArrayResult);

    expect(bigIntsResult[0].toString()).toEqual(resultx.toString());
  });
});