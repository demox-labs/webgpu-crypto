/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { field_add } from "./gpu/fieldEntry";
import { u256_add } from "./gpu/entries/fieldModulusU256AddEntry";
import { u256_sub } from "./gpu/entries/fieldModulusU256SubEntry";
import { u256_gt } from "./gpu/entries/fieldModulusU256GTEntry";
import { u256_subw } from "./gpu/entries/fieldModulusU256SubWEntry";

const GPUFunctionLoader: React.FC = () => {
  const input = new Uint32Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const functions = [field_add, u256_add, u256_sub, u256_gt, u256_subw];
  return (
    <div>
      {functions.map((fn, index) => (
        <button key={index} onClick={async () => console.log(await fn(input, input))}>
          {fn.name}
        </button>
      ))}
    </div>
  );
};

export default GPUFunctionLoader;