/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { u256_add } from "./gpu/entries/fieldModulusU256AddEntry";
import { u256_sub } from "./gpu/entries/fieldModulusU256SubEntry";
import { u256_gt } from "./gpu/entries/fieldModulusU256GTEntry";
import { u256_subw } from "./gpu/entries/fieldModulusU256SubWEntry";
import { u256_double } from './gpu/entries/fieldModulusU256DoubleEntry';
import { u256_right_shift } from "./gpu/entries/fieldModulusU256RightShiftEntry";
import { field_multiply } from "./gpu/entries/fieldModulusFieldMultiplyEntry";
import { field_reduce } from "./gpu/entries/fieldModulusFieldReduceEntry";
import { field_add } from "./gpu/entries/fieldAddEntry";
import { field_sub } from "./gpu/entries/fieldSubEntry";
import { field_inverse } from "./gpu/entries/fieldInverseEntry";
import { u256_rs1 } from "./gpu/entries/fieldModulusU256RightShiftOneEntry";

const GPUFunctionLoader: React.FC = () => {
  let input: Array<number> = [];
  for (let i = 0; i < 127; i++) {
    input = input.concat([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  // const input: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, ];
  const double_input_functions = [u256_add, u256_sub, u256_gt, u256_subw, field_add, field_sub, field_multiply];
  const single_input_functions = [field_reduce, u256_double, field_inverse, u256_rs1];
  const single_u256s_input_with_constant = [u256_right_shift]
  return (
    <div>
      {double_input_functions.map((fn, index) => (
        <button className="border-2" key={index} onClick={async () => console.log(await fn(input, input))}>
          {fn.name}
        </button>
      ))}
      {single_input_functions.map((fn, index) => (
        <button className="border-2" key={index} onClick={async () => console.log(await fn(input))}>
          {fn.name}
        </button>
      ))}
      {single_u256s_input_with_constant.map((fn, index) => (
        <button key={index} onClick={async () => console.log(await fn(input, 5))}>
          {fn.name}
        </button>
      ))}
    </div>
  );
};

export default GPUFunctionLoader;