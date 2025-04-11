'use client';

import { Suspense } from 'react';

// Create a separate component for the part that uses useSearchParams
import SuccessContent from '@/components/SuccessContent';

export default function SuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg shadow-md">
        <Suspense fallback={<SuccessLoading />}>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}

// Simple loading component
function SuccessLoading() {
  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
        <svg 
          className="h-6 w-6 text-blue-600 animate-spin" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          ></circle>
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Loading...</h2>
      <p className="mt-2 text-sm text-gray-600">
        Please wait while we process your submission.
      </p>
    </div>
  );
}
