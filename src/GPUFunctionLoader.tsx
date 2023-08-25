/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { u256_right_shift } from "./gpu/entries/u256/u256RightShiftEntry";
import { point_add } from "./gpu/entries/curve/curveAddPointsEntry";
import { point_double } from "./gpu/entries/curve/curveDoublePointEntry";
import { point_mul } from "./gpu/entries/curve/curveMulPointEntry";
import { field_entry } from "./gpu/entries/field/fieldEntry";
import { CurveType } from "./gpu/params";
import { u256_entry } from "./gpu/entries/u256/u256Entry";
import { u256_gt } from "./gpu/entries/u256/u256GTEntry";
import { gpuU32Inputs } from "./gpu/utils";

const GPUFunctionLoader: React.FC = () => {
  const input: gpuU32Inputs = { u32Inputs: new Uint32Array(), individualInputSize: 0};
  // used for testing -- without this, the functions are not loaded onto the dom and cannot be called in-browser through puppeteer.
  const double_input_functions = [u256_gt, point_add, point_mul];
  const single_input_functions = [point_double];
  const single_u256s_input_with_constant = [u256_right_shift]
  return (
    <div>
      {double_input_functions.map((fn, index) => (
        <button className="invisible" key={index} onClick={async () => console.log(await fn(input, input))}>
          {fn.name}
        </button>
      ))}
      {single_input_functions.map((fn, index) => (
        <button className="invisible" key={index} onClick={async () => console.log(await fn(input))}>
          {fn.name}
        </button>
      ))}
      {single_u256s_input_with_constant.map((fn, index) => (
        <button className="invisible" key={index} onClick={async () => console.log(await fn(input, 5))}>
          {fn.name}
        </button>
      ))}
      <button className="invisible" onClick={async () => console.log(await field_entry('field_add', CurveType.BLS12_377, [input]))} />
      <button className="invisible" onClick={async () => console.log(await u256_entry('u256_add', [input]))} />
    </div>
  );
};

export default GPUFunctionLoader;