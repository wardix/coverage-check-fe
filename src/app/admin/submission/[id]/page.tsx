'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService, FormSubmission } from '@/services/api';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id as string;

  const [submission, setSubmission] = useState<FormSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Get API key from localStorage
    const storedKey = localStorage.getItem('admin_api_key');
    if (!storedKey) {
      toast.error('Authentication required');
      router.push('/admin');
      return;
    }

    setApiKey(storedKey);
    fetchSubmission(storedKey);
  }, [submissionId, router]);

  const fetchSubmission = async (key: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.getSubmission(submissionId, key);
      setSubmission(data);
    } catch (error) {
      console.error('Error fetching submission:', error);
      toast.error('Failed to fetch submission details');
      router.push('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AdminNavbar />
        <div className="container mx-auto p-6 max-w-4xl">
          <Skeleton height={50} className="mb-6" />
          <Skeleton height={30} className="mb-4" count={8} />
          <Skeleton height={200} className="mb-4" count={2} />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen">
        <AdminNavbar />
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-700 font-medium">Submission not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">Submission Details</h1>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2 text-gray-800">Submission Information</h2>
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">ID</p>
                  <p className="font-mono text-gray-900 font-medium">{submission.id}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Timestamp</p>
                  <p className="text-gray-900 font-medium">{formatDate(submission.timestamp)}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Salesman</p>
                  <p className="text-gray-900 font-medium">{submission.salesmanName}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2 text-gray-800">Customer Information</h2>
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Name</p>
                  <p className="text-gray-900 font-medium">{submission.customerName}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Address</p>
                  <p className="whitespace-pre-line text-gray-900 font-medium">{submission.customerAddress}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Village</p>
                  <p className="text-gray-900 font-medium">{submission.village}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-1">Coordinates</p>
                  <p className="text-gray-900 font-medium">{submission.coordinates}</p>
                  {submission.coordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${submission.coordinates}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:text-blue-900 hover:underline text-sm mt-2 inline-block font-medium"
                    >
                      View on Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Order Information</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">Building Type</p>
                <p className="text-gray-900 font-medium">{submission.buildingType}</p>
              </div>

              <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">Operators</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {submission.operators.map((operator) => (
                    <span
                      key={operator}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-200 text-blue-800 border border-blue-300"
                    >
                      {operator}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {submission.buildingPhotos && submission.buildingPhotos.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2 text-gray-800">Building Photos</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {submission.buildingPhotos.map((photo, index) => (
                  <div key={index} className="bg-gray-100 p-2 rounded-md border border-gray-200">
                    <a
                      href={`/uploads/${photo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={`/uploads/${photo}`}
                        alt={`Building photo ${index + 1}`}
                        className="w-full h-48 object-cover rounded-md border border-gray-300"
                      />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Link
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
