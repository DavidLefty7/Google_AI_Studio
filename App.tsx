import React, { useState, useCallback, useEffect } from 'react';
import { runAnalysisOrchestrator } from './services/geminiService';
import type { MacroAnalysisResult } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ResultDisplay } from './components/ResultDisplay';
import { ErrorAlert } from './components/ErrorAlert';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start in loading state
  const [statusMessage, setStatusMessage] = useState<string>('Initiating analysis...');
  const [result, setResult] = useState<MacroAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = useCallback(async () => {
    // Ensure loading state is set at the beginning of a run
    if (!isLoading) setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const analysisResult = await runAnalysisOrchestrator(setStatusMessage);
      if (analysisResult) {
        setResult(analysisResult);
        setStatusMessage('Analysis complete.');
      } else {
        setError('The analysis could not be completed.');
        setStatusMessage('Analysis failed.');
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`An error occurred: ${errorMessage}`);
      setStatusMessage('Analysis failed.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // useEffect to run the analysis automatically on component mount
  useEffect(() => {
    handleRunAnalysis();
  }, []); // Empty dependency array ensures this runs only once on mount


  const handleDownloadJson = () => {
    if (!result) return;
    const jsonString = JSON.stringify(result, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financial_analysis_output.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-blue-500 to-purple-600">
            Financial News Analysis
          </h1>
          <p className="mt-2 text-lg text-gray-400">
            An AI-powered two-agent system for macro-economic insights.
          </p>
        </header>

        <main className="bg-gray-800 rounded-xl shadow-2xl p-6">
          <div className="flex flex-col items-center">
            <button
              onClick={handleRunAnalysis}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isLoading ? 'Analyzing...' : (error ? 'Try Again' : 'Re-run Analysis')}
            </button>
          </div>

          <div className="mt-6 min-h-[24rem] p-4 bg-gray-900 rounded-lg border border-gray-700">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner />
                <p className="mt-4 text-lg text-gray-300 animate-pulse">{statusMessage}</p>
              </div>
            )}

            <ErrorAlert error={error} />

            {result && !isLoading && (
               <>
                <ResultDisplay result={result} />
                <div className="text-center mt-6">
                    <button
                        onClick={handleDownloadJson}
                        className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-300"
                    >
                        Download JSON
                    </button>
                </div>
               </>
            )}

            {!isLoading && !result && !error && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-xl">Analysis will begin shortly.</p>
              </div>
            )}
          </div>
        </main>
        
        <footer className="text-center mt-8 text-gray-500">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
