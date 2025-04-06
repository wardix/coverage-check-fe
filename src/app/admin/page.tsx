'use client';

import { useState, useEffect } from 'react';
import { apiService, FormSubmission } from '@/services/api';
import { toast } from 'react-toastify';
import Skeleton from 'react-loading-skeleton';
import Link from 'next/link';
import AdminNavbar from '@/components/AdminNavbar';

export default function AdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Check if API key is stored in localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem('admin_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsVerified(true);
      fetchSubmissions(storedKey);
    }
  }, []);

  const verifyApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiService.getSubmissions(apiKey);
      setSubmissions(data);
      setIsVerified(true);
      
      // Store API key in localStorage
      localStorage.setItem('admin_api_key', apiKey);
      toast.success('API key verified successfully');
    } catch (error) {
      console.error('Error verifying API key:', error);
      toast.error('Invalid API key');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmissions = async (key: string) => {
    setIsLoading(true);
    try {
      const data = await apiService.getSubmissions(key);
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to fetch submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const logout = () => {
    localStorage.removeItem('admin_api_key');
    setApiKey('');
    setIsVerified(false);
    setSubmissions([]);
  };

  return (
    <div className="min-h-screen">
      {isVerified && <AdminNavbar />}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            View all building information submissions
          </p>
        </header>

        {!isVerified ? (
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
            <h2 className="text-xl font-semibold mb-4">Admin Authentication</h2>
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="Enter your API key"
              />
            </div>
            <button
              onClick={verifyApiKey}
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Verifying...' : 'Login'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Submissions</h2>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>

            {isLoading ? (
              <Skeleton height={100} count={5} className="mb-4" />
            ) : submissions.length === 0 ? (
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-gray-500">No submissions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salesman
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Building Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Photos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(submission.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {submission.salesmanName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.buildingType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.buildingPhotos?.length || 0} photo(s)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <Link
                            href={`/admin/submission/${submission.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
