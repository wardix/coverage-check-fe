import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Define types
export type FormSubmission = {
  id: string;
  timestamp: string;
  salesmanName: string;
  customerName: string;
  customerAddress: string;
  village: string; // Added village field
  coordinates: string;
  buildingType: string;
  operators: string[];
  buildingPhotos?: string[];
};

export type SubmissionResponse = {
  success: boolean;
  submissionId?: string;
  timestamp?: string;
  message?: string;
};

// Create an axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API functions
export const apiService = {
  // Health check
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  // Get salesmen list (all)
  getSalesmen: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/salesman');
    return response.data;
  },

  // Search salesmen (with query parameter)
  searchSalesmen: async (query: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/salesman/search`, {
      params: { query }
    });
    return response.data;
  },

  // Search villages (with query parameter)
  searchVillages: async (query: string): Promise<string[]> => {
    const response = await api.get<string[]>(`/villages/search`, {
      params: { query }
    });
    return response.data;
  },

  // Get building types
  getBuildingTypes: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/building-types');
    return response.data;
  },

  // Submit form data
  submitForm: async (formData: FormData): Promise<SubmissionResponse> => {
    const response = await api.post<SubmissionResponse>('/submit-form', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get all submissions (requires API key)
  getSubmissions: async (apiKey: string): Promise<FormSubmission[]> => {
    const response = await api.get<FormSubmission[]>('/submissions', {
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.data;
  },

  // Get a single submission (requires API key)
  getSubmission: async (id: string, apiKey: string): Promise<FormSubmission> => {
    const response = await api.get<FormSubmission>(`/submissions/${id}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    });
    return response.data;
  },
};
