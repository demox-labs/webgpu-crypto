import React, { useCallback } from 'react';
import { GPUDecryptor } from './algorithms/GPUDecryptor';

const GPUPerformanceButton: React.FC = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const onClickHandler = useCallback(async () => {
    if (isRunning) {
      return;
    }
    setIsRunning(true);
    await new GPUDecryptor().sample();
    setIsRunning(false);
  }, [isRunning]);

  return (
    <button onClick={async () => { await onClickHandler(); }}>
      Click me to run GPU
    </button>
  );
};

export default GPUPerformanceButton;