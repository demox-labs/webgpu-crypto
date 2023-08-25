import { gpuU32Inputs, gpuU32PuppeteerString } from "../../utils";

// used for evaluating in the puppeteer context
export const u256EntryEvaluationString = (
  wgslFunction: string,
  inputs: gpuU32Inputs[]
  ) => {
    let evalString = `(u256_entry)('${wgslFunction}', [`;
    for (let i = 0; i < inputs.length; i++) {
      evalString += `${gpuU32PuppeteerString(inputs[i])},`
    }
    evalString += '])';
    return evalString;
  };