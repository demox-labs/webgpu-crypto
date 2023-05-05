/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import ReactDOM from "react-dom";
import GPUFunctionLoader from "./GPUFunctionLoader";
import './main.css';
import { AllBenchmarks } from "./ui/AllBenchmarks";

const App = () => (
  <>
    <h1 className="font-bold">GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <AllBenchmarks />
    <GPUFunctionLoader />
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
