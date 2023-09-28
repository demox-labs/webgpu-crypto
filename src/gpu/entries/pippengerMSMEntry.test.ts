// import puppeteer from 'puppeteer';
// import { Browser } from 'puppeteer';
// import { bigIntsToU16Array, u32ArrayToBigInts } from '../utils';
// import { FieldMath } from '../../utils/BLS12_377FieldMath';

describe('dummyTest', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });
});

// describe('pippengerMSM', () => {
//   let browser: Browser;
//   beforeAll(async () => {
//     browser = await puppeteer.launch({
//       // Might need to be configurable at some point. 
//       // '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome'
//       //executablePath: '/Applications/Google\ Chrome\ Beta.app/Contents/MacOS/Google\ Chrome\ Beta',
//       executablePath: '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
//       devtools: true,
//       headless: false,
//       args: ['#enable-webgpu-developer-features']
//     });

//     const page = (await browser.pages())[0];
//     await page.goto("http://localhost:4000");
//   });

//   afterAll(async () => {
//     await browser.close();
//   });

//   it.each([
//     [
//       [BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246')],
//       [BigInt('4115981352351835515120931692070964483678586420443690054992391095360224208994')],
//       BigInt('2003769298882165992553856497540267294464327539507494098187236363544388186784')
//     ],
//     [
//       [BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246'),
//         BigInt('2796670805570508460920584878396618987767121022598342527208237783066948667246')],
//       [BigInt('4815997971641423936781886037889355281829129259429609070232507389609965623593'),
//         BigInt('2592192440869895559682132736176579095549249684480407380090163054781396615195')],
//       BigInt('3286038430103828453403177968732741410787578586833327588879065467465127482803')
//     ]
//   ])('should compute MSM', async (
//     affinePointXCoords: bigint[],
//     scalars: bigint[],
//     expectedAffinePointXCoord: bigint,
//     ) => {
//     const fieldMath = new FieldMath();
//     const extendedPoints = [];
//     for (let i = 0; i < affinePointXCoords.length; i++) {
//         extendedPoints.push(fieldMath.getPointFromX(affinePointXCoords[i]));
//     }
//     const scalarsAsU16s = Array.from(bigIntsToU16Array(scalars));

//     const result = await ((await browser.pages())[0]).evaluate(`(pippenger_msm)([${extendedPoints}], [${scalarsAsU16s}], [${fieldMath}])`);
//     const arr = Object.values(result as object);
//     const uint32ArrayResult = new Uint32Array(arr);
//     const bigIntsResult = u32ArrayToBigInts(uint32ArrayResult);

//     expect(bigIntsResult[0].toString()).toEqual(expectedAffinePointXCoord.toString());
//   });
// });

export {};