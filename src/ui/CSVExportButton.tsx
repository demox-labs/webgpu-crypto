import React from 'react';

interface CSVExportButtonProps {
  data: string[][];
  filename: string;
}

const CSVExportButton: React.FC<CSVExportButtonProps> = ({ data, filename }) => {
  const convertToCSV = (data: string[][]): string => {
    return data.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
  };

  const handleExportClick = () => {
    const csvData = convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button className="bg-purple-500 text-white px-4 py-2 rounded-md" onClick={handleExportClick}>
      Export CSV
    </button>
  );
};

export default CSVExportButton;
