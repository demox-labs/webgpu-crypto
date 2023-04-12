import React, { useCallback } from 'react';
import { GPUDecryptor } from './algorithms/GPUDecryptor';
import { actualUint256Addition } from './gpu/uint256Addition';
import { matrixMultiplication } from './gpu/matrixMultiplication';

const GPUPerformanceButton: React.FC = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const onClickHandler = useCallback(async () => {
    if (isRunning) {
      return;
    }
    setIsRunning(true);
    await new GPUDecryptor().sample();
    await actualUint256Addition();
    await matrixMultiplication();
    setIsRunning(false);
  }, [isRunning]);

  return (
    <button onClick={async () => { await onClickHandler(); }}>
      Click me to run GPU
    </button>
  );
};

export default GPUPerformanceButton;