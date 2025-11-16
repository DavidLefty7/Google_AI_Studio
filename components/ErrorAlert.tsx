
import React from 'react';

interface ErrorAlertProps {
  error: string | null;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-lg relative my-4" role="alert">
      <strong className="font-bold">Error: </strong>
      <span className="block sm:inline">{error}</span>
    </div>
  );
};
