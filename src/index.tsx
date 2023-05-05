/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import ReactDOM from "react-dom";
import GPUFunctionLoader from "./GPUFunctionLoader";
import { DoubleInputBufferBenchmark } from "./ui/DoubleInputBufferBenchmark";
import { field_add } from "./gpu/entries/fieldAddEntry";
import { addFields, doubleField, subFields } from "./utils/wasmFunctions";
import './main.css';
import { field_sub } from "./gpu/entries/fieldSubEntry";
import { SingleInputBufferBenchmark } from "./ui/SingleInputBufferBenchmark";
import { field_double } from "./gpu/entries/fieldDoubleEntry";

const App = () => (
  <>
    <h1 className="font-bold">GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <DoubleInputBufferBenchmark name={'Add Fields'} gpuFunc={field_add} wasmFunc={addFields} />
    <DoubleInputBufferBenchmark name={'Subtract Fields'} gpuFunc={field_sub} wasmFunc={subFields} />
    <SingleInputBufferBenchmark name={'Double Field'} gpuFunc={field_double} wasmFunc={doubleField} />
    <GPUFunctionLoader />
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
