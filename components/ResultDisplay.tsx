
import React from 'react';
import type { MacroAnalysisResult } from '../types';

interface ResultDisplayProps {
  result: MacroAnalysisResult;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => (
  <div>
    <h2 className="text-2xl font-bold mb-4 text-center text-gray-200">Analysis Result</h2>
    <div className="bg-gray-900/50 p-4 rounded-lg text-left text-sm font-mono whitespace-pre-wrap overflow-x-auto">
      <code>
        {JSON.stringify(result, null, 2)}
      </code>
    </div>
  </div>
);
