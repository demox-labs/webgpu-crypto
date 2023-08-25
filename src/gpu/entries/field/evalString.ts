import { CurveType } from "../../params";
import { gpuU32Inputs, gpuU32PuppeteerString } from "../../utils";

// used for evaluating in the puppeteer context
export const fieldEntryEvaluationString = (
  wgslFunction: string,
  curve: CurveType,
  inputs: gpuU32Inputs[]
  ) => {
    let evalString = `(field_entry)('${wgslFunction}', '${curve.toString()}', [`;
    for (let i = 0; i < inputs.length; i++) {
      evalString += `${gpuU32PuppeteerString(inputs[i])},`
    }
    evalString += '])';
    return evalString;
  };