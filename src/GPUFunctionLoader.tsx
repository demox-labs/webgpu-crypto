/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { u256_add } from "./gpu/entries/fieldModulusU256AddEntry";
import { u256_sub } from "./gpu/entries/fieldModulusU256SubEntry";
import { u256_gt } from "./gpu/entries/fieldModulusU256GTEntry";
import { u256_subw } from "./gpu/entries/fieldModulusU256SubWEntry";
import { field_reduce } from "./gpu/entries/fieldModulusFieldReduceEntry";

const GPUFunctionLoader: React.FC = () => {
  const input: Array<number> = [1, 2, 3, 4, 5, 6, 7, 8];
  const double_input_functions = [u256_add, u256_sub, u256_gt, u256_subw];
  const single_input_functions = [field_reduce];
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