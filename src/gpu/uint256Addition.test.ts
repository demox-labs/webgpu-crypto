import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';

import { actualUint256Addition } from './uint256Addition';

describe('uint256Addition', () => {
  jest.setTimeout(60_000);
  it('should add uint256 numbers', async () => {
    const browser = await puppeteer.launch({
      executablePath: '/Applications/Google\ Chrome\ Beta.app/Contents/MacOS/Google\ Chrome\ Beta',
      devtools: true,
      headless: false,
      args: ['#enable-webgpu-developer-features']
    });
    // const page = await browser.newPage();
    const externalFunctionFilePath = path.resolve('./src/gpu/uint256Addition.ts');
    const fileContent = await fs.readFile(externalFunctionFilePath, 'utf-8');

    // Extract the function string
    const functionStringMatch = fileContent.match(/async function actualUint256Addition[^{]*\{[\s\S]*?(?<=^|\n)\}/m);
    const functionString = functionStringMatch && functionStringMatch[0];
    
    const result = await ((await browser.pages())[0]).evaluate(`(${functionString})()`) as Uint32Array;
    await browser.close();

    expect(result.length).toBeGreaterThan(0);
  });
});