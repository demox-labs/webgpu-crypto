/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { u256_add } from "./gpu/entries/fieldModulusU256AddEntry";
import { u256_sub } from "./gpu/entries/fieldModulusU256SubEntry";
import { u256_gt } from "./gpu/entries/fieldModulusU256GTEntry";
import { u256_subw } from "./gpu/entries/fieldModulusU256SubWEntry";
import { u256_double } from './gpu/entries/fieldModulusU256DoubleEntry';
import { field_reduce } from "./gpu/entries/fieldModulusFieldReduceEntry";
import { field_add } from "./gpu/entries/fieldAddEntry";
import { field_sub } from "./gpu/entries/fieldSubEntry";

const GPUFunctionLoader: React.FC = () => {
  let input: Array<number> = [];
  for (let i = 0; i < 127; i++) {
    input = input.concat([1, 2, 3, 4, 5, 6, 7, 8]);
  }
  // const input: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8, ];
  const double_input_functions = [u256_add, u256_sub, u256_gt, u256_subw, field_add, field_sub];
  const single_input_functions = [field_reduce, u256_double];
  return (
    <div>
      {double_input_functions.map((fn, index) => (
        <button key={index} onClick={async () => console.log(await fn(input, input))}>
          {fn.name}
        </button>
      ))}
      {single_input_functions.map((fn, index) => (
        <button key={index} onClick={async () => console.log(await fn(input))}>
          {fn.name}
        </button>
      ))}
    </div>
  );
};

export default GPUFunctionLoader;