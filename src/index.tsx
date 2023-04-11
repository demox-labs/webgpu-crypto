import React from "react";
import ReactDOM from "react-dom";
import PerformanceButton from "./performanceButton";
import GPUPerformanceButton from "./GPUPerformanceButton";

const App = () => (
  <>
    <h1>GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <PerformanceButton></PerformanceButton>
    <GPUPerformanceButton />
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
