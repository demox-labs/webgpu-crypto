/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { u256_add } from "./gpu/entries/u256/u256AddEntry";
import { u256_sub } from "./gpu/entries/u256/u256SubEntry";
import { u256_gt } from "./gpu/entries/u256/u256GTEntry";
import { u256_subw } from "./gpu/entries/u256/u256SubWEntry";
import { u256_double } from './gpu/entries/u256/u256DoubleEntry';
import { u256_right_shift } from "./gpu/entries/u256/u256RightShiftEntry";
import { field_multiply } from "./gpu/entries/field/fieldModulusFieldMultiplyEntry";
import { field_reduce } from "./gpu/entries/field/fieldModulusFieldReduceEntry";
import { field_add } from "./gpu/entries/field/fieldAddEntry";
import { field_sub } from "./gpu/entries/field/fieldSubEntry";
import { field_inverse } from "./gpu/entries/field/fieldInverseEntry";
import { u256_rs1 } from "./gpu/entries/u256/u256RightShiftOneEntry";
import { point_add } from "./gpu/entries/curve/curveAddPointsEntry";
import { field_pow } from "./gpu/entries/field/fieldModulusExponentiationEntry";
import { field_sqrt } from "./gpu/entries/field/fieldSqrtEntry";
import { point_double } from "./gpu/entries/curve/curveDoublePointEntry";
import { point_mul } from "./gpu/entries/curve/curveMulPointEntry";

const GPUFunctionLoader: React.FC = () => {
  // used for testing -- without this, the functions are not loaded onto the dom and cannot be called in-browser through puppeteer.
  const double_input_functions = [u256_add, u256_sub, u256_gt, u256_subw, field_add, field_sub, field_multiply, point_add, field_pow, point_mul];
  const single_input_functions = [field_reduce, u256_double, field_inverse, u256_rs1, field_sqrt, point_double];
  const single_u256s_input_with_constant = [u256_right_shift]
  return (
    <div>
    </div>
  );
};

export default GPUFunctionLoader;