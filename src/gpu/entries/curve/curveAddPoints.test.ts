import puppeteer from 'puppeteer';
import { Browser } from 'puppeteer';
import { bigIntsToU32Array, gpuU32Inputs, gpuU32PuppeteerString, u32ArrayToBigInts } from '../../utils';
import { AFFINE_POINT_SIZE } from '../../U32Sizes';

describe('curveAddPoints', () => {
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
      BigInt('2267804453849548326441105932178046088516965666196959520730613219383769450836'),
      BigInt('1072951797970064815719882445234806898669878320855410398424678322112654070151'),
      BigInt('4407911307578806921901458939347649080208231626630832716981525978619048166152'),
      BigInt('6565636154300619788727298316911861941870758292624133564236686502629302140344'),
      BigInt('5786258225753402907650271726047597104252057332301870339194408122376703625189'),
      // BigInt('3590369170636338728341911025963343651055585602080772103462129809241739037174')
    ],
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt(0),
      BigInt(1),
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      // BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
    ],
    [
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
      BigInt('8134280397689638111748378379571739274369602049665521098046934931245960532166'),
      BigInt('7304662912603109101654342147238231070235863099037011884568440290807776100174')
    ]
  ])('should add affine points together', async (
    p1x: bigint,
    p1y: bigint,
    p2x: bigint,
    p2y: bigint,
    resultx: bigint,
    ) => {
    const u32Input1: gpuU32Inputs = { u32Inputs: bigIntsToU32Array([p1x, p1y]), individualInputSize: AFFINE_POINT_SIZE };
    const u32Input2: gpuU32Inputs = { u32Inputs: bigIntsToU32Array([p2x, p2y]), individualInputSize: AFFINE_POINT_SIZE };
    const result = await ((await browser.pages())[0]).evaluate(`(point_add)(${gpuU32PuppeteerString(u32Input1)}, ${gpuU32PuppeteerString(u32Input2)})`);
    const arr = Object.values(result as object);
    const uint32ArrayResult = new Uint32Array(arr);
    const bigIntsResult = u32ArrayToBigInts(uint32ArrayResult);

    expect(bigIntsResult[0].toString()).toEqual(resultx.toString());
  });
});