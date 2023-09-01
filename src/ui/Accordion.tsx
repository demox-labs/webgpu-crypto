// BenchmarkAccordion.tsx
import React, { useState } from 'react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-gray-300 rounded-lg p-4 my-2">
      <button onClick={() => setIsOpen(!isOpen)}>
        {title} {isOpen ? "▲" : "▼"}
      </button>
      {isOpen && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};
