'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('id');

  return (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
        <svg
          className="h-6 w-6 text-green-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Submission Successful!</h2>
      <p className="mt-2 text-sm text-gray-600">
        Your building information has been successfully recorded.
      </p>
      {submissionId && (
        <p className="mt-2 text-sm text-gray-500">
          Submission ID: <span className="font-mono">{submissionId}</span>
        </p>
      )}
      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-center">
          <Link
            href="/"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Submit Another Entry
          </Link>
        </div>
      </div>
    </div>
  );
}
