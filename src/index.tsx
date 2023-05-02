import React from "react";
import ReactDOM from "react-dom";
import PerformanceButton from "./performanceButton";
import GPUPerformanceButton from "./GPUPerformanceButton";
import GPUFunctionLoader from "./GPUFunctionLoader";

const App = () => (
  <>
    <h1>GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <PerformanceButton />
    <GPUPerformanceButton />
    <GPUFunctionLoader />
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
