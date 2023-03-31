import { runBenchMarks } from './perf';

const PerformanceButton: React.FC = () => {
  return (
    <button onClick={async () => await runBenchMarks()}>
      Click me to run performance tests
    </button>
  );
};

export default PerformanceButton;