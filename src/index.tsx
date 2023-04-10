import React from "react";
import ReactDOM from "react-dom";
import PerformanceButton from "./performanceButton";

const App = () => (
  <>
    <h1>GPU Record Scanning {new Date().toLocaleDateString()}</h1>
    <PerformanceButton></PerformanceButton>
  </>
);

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
