'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { toast } from 'react-toastify';
import axios from 'axios';
import AdminNavbar from '@/components/AdminNavbar';

// Define a simple response structure type
interface ApiResponse {
  success?: boolean;
  salesmanData?: string[];
  buildingTypes?: string[];
  error?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  const [newSalesman, setNewSalesman] = useState('');
  const [newBuildingType, setNewBuildingType] = useState('');
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [isLoadingSalesmen, setIsLoadingSalesmen] = useState(false);
  const [isLoadingBuildingTypes, setIsLoadingBuildingTypes] = useState(false);
  const [isAddingSalesman, setIsAddingSalesman] = useState(false);
  const [isAddingBuildingType, setIsAddingBuildingType] = useState(false);

  useEffect(() => {
    // Get API key from localStorage
    const storedKey = localStorage.getItem('admin_api_key');
    if (!storedKey) {
      toast.error('Authentication required');
      router.push('/admin');
      return;
    }

    setApiKey(storedKey);
    fetchSalesmen();
    fetchBuildingTypes();
  }, [router]);

  const fetchSalesmen = async () => {
    setIsLoadingSalesmen(true);
    try {
      const data = await apiService.getSalesmen();
      setSalesmen(data);
    } catch (error) {
      console.error('Error fetching salesmen:', error);
      toast.error('Failed to fetch salesmen');
    } finally {
      setIsLoadingSalesmen(false);
    }
  };

  const fetchBuildingTypes = async () => {
    setIsLoadingBuildingTypes(true);
    try {
      const data = await apiService.getBuildingTypes();
      setBuildingTypes(data);
    } catch (error) {
      console.error('Error fetching building types:', error);
      toast.error('Failed to fetch building types');
    } finally {
      setIsLoadingBuildingTypes(false);
    }
  };

  const addSalesman = async () => {
    if (!newSalesman.trim()) {
      toast.error('Please enter a salesman name');
      return;
    }

    if (!apiKey) {
      toast.error('Authentication required');
      router.push('/admin');
      return;
    }

    setIsAddingSalesman(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await axios.post<ApiResponse>(`${API_URL}/salesman`, { name: newSalesman }, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.data.success) {
        toast.success('Salesman added successfully');
        if (response.data.salesmanData) {
          setSalesmen(response.data.salesmanData);
        }
        setNewSalesman('');
      } else {
        toast.error(response.data.error || 'Failed to add salesman');
      }
    } catch (error) {
      console.error('Error adding salesman:', error);
      // Safer error handling without type assertions
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorMsg = typeof error.response.data === 'object' && 
                       'error' in error.response.data ? 
                       String(error.response.data.error) : 
                       'Failed to add salesman';
        toast.error(errorMsg);
      } else {
        toast.error('Failed to add salesman');
      }
    } finally {
      setIsAddingSalesman(false);
    }
  };

  const addBuildingType = async () => {
    if (!newBuildingType.trim()) {
      toast.error('Please enter a building type');
      return;
    }

    if (!apiKey) {
      toast.error('Authentication required');
      router.push('/admin');
      return;
    }

    setIsAddingBuildingType(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
      const response = await axios.post<ApiResponse>(`${API_URL}/building-types`, { type: newBuildingType }, {
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (response.data.success) {
        toast.success('Building type added successfully');
        if (response.data.buildingTypes) {
          setBuildingTypes(response.data.buildingTypes);
        }
        setNewBuildingType('');
      } else {
        toast.error(response.data.error || 'Failed to add building type');
      }
    } catch (error) {
      console.error('Error adding building type:', error);
      // Safer error handling without type assertions
      if (axios.isAxiosError(error) && error.response?.data) {
        const errorMsg = typeof error.response.data === 'object' && 
                       'error' in error.response.data ? 
                       String(error.response.data.error) : 
                       'Failed to add building type';
        toast.error(errorMsg);
      } else {
        toast.error('Failed to add building type');
      }
    } finally {
      setIsAddingBuildingType(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AdminNavbar />
      <div className="container mx-auto p-6 max-w-4xl">

      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Salesmen Management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Salesmen</h2>
          
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSalesman}
                onChange={(e) => setNewSalesman(e.target.value)}
                placeholder="Enter new salesman name"
                className="flex-1 p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={addSalesman}
                disabled={isAddingSalesman}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium ${
                  isAddingSalesman ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAddingSalesman ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">Current Salesmen</h3>
            {isLoadingSalesmen ? (
              <p className="text-gray-500">Loading...</p>
            ) : salesmen.length === 0 ? (
              <p className="text-gray-500">No salesmen found</p>
            ) : (
              <ul className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                {salesmen.map((name) => (
                  <li key={name} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Building Types Management */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Building Types</h2>
          
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newBuildingType}
                onChange={(e) => setNewBuildingType(e.target.value)}
                placeholder="Enter new building type"
                className="flex-1 p-2 border border-gray-300 rounded-md"
              />
              <button
                onClick={addBuildingType}
                disabled={isAddingBuildingType}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium ${
                  isAddingBuildingType ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isAddingBuildingType ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">Current Building Types</h3>
            {isLoadingBuildingTypes ? (
              <p className="text-gray-500">Loading...</p>
            ) : buildingTypes.length === 0 ? (
              <p className="text-gray-500">No building types found</p>
            ) : (
              <ul className="bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                {buildingTypes.map((type) => (
                  <li key={type} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0 last:mb-0 last:pb-0">
                    {type}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
