import React, { useCallback } from 'react';
import { runBenchmarks } from './perf';

const PerformanceButton: React.FC = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const onClickHandler = useCallback(async () => {
    if (isRunning) {
      return;
    }
    setIsRunning(true);
    await runBenchmarks();
    setIsRunning(false);
  }, [isRunning]);

  return (
    <button onClick={async () => { await onClickHandler(); }}>
      Click me to run performance tests
    </button>
  );
};

export default PerformanceButton;