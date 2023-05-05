/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import ReactDOM from "react-dom";
import GPUFunctionLoader from "./GPUFunctionLoader";
import { BenchmarkFieldAdd } from "./ui/BenchmarkFieldAdd";
import { field_add } from "./gpu/entries/fieldAddEntry";
import { addFields } from "./utils/wasmFunctions";
import './main.css';

const App = () => (
  <>
    <h1 className="font-bold">GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <BenchmarkFieldAdd />
    <GPUFunctionLoader />
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
