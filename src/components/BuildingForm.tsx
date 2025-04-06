'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormValues, formSchema } from '@/lib/validation';
import { apiService } from '@/services/api';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import Skeleton from 'react-loading-skeleton';

const BuildingForm = () => {
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      operators: [],
      coordinates: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesmenData, buildingTypesData] = await Promise.all([
          apiService.getSalesmen(),
          apiService.getBuildingTypes(),
        ]);
        setSalesmen(salesmenData);
        setBuildingTypes(buildingTypesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load form data. Please refresh the page.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('salesmanName', data.salesmanName);
      formData.append('customerName', data.customerName);
      formData.append('customerAddress', data.customerAddress);
      formData.append('coordinates', data.coordinates);
      formData.append('buildingType', data.buildingType);
      
      // Append operators as multiple values
      data.operators.forEach(operator => {
        formData.append('operators', operator);
      });
      
      // Append photos if any
      if (data.buildingPhotos) {
        const files = data.buildingPhotos as FileList;
        
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            formData.append('buildingPhotos', files[i]);
          }
        }
      }
      
      console.log('Form data being sent:');
      for (const pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      const response = await apiService.submitForm(formData);
      
      if (response.success) {
        toast.success('Form submitted successfully!');
        router.push(`/success?id=${response.submissionId}`);
      } else {
        toast.error(response.message || 'Failed to submit form');
      }
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common operators for selection
  const commonOperators = [
    'Elevator',
    'HVAC',
    'Fire Alarm',
    'Security System',
    'Plumbing',
    'Electrical',
    'Lighting',
  ];

  // Function to get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Format the coordinates as "latitude,longitude"
        const coordinates = `${position.coords.latitude},${position.coords.longitude}`;
        
        // Use React Hook Form's setValue method to properly update the form state
        // This ensures the form validation is aware of the value change
        setValue('coordinates', coordinates, { 
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true
        });
        
        setIsLoading(false);
        toast.success('Location captured successfully');
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to retrieve your location');
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Skeleton height={50} className="mb-6" />
        <Skeleton height={40} className="mb-4" count={6} />
        <Skeleton height={100} className="mb-4" />
        <Skeleton height={60} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Building Information Form</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Salesman Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Salesman Name*</label>
          <select
            {...register('salesmanName')}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select a salesman</option>
            {salesmen.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {errors.salesmanName && (
            <p className="mt-1 text-sm text-red-600">{errors.salesmanName.message}</p>
          )}
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name*</label>
          <input
            type="text"
            {...register('customerName')}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
          )}
        </div>

        {/* Customer Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Address*</label>
          <textarea
            {...register('customerAddress')}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.customerAddress && (
            <p className="mt-1 text-sm text-red-600">{errors.customerAddress.message}</p>
          )}
        </div>

        {/* Coordinates with Get Location button */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coordinates*</label>
          <div className="flex gap-2">
            <input
              id="coordinates"
              type="text"
              {...register('coordinates')}
              placeholder="latitude,longitude"
              className="flex-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => {
                getCurrentLocation();
              }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Get Location
            </button>
          </div>
          {errors.coordinates && (
            <p className="mt-1 text-sm text-red-600">{errors.coordinates.message}</p>
          )}
        </div>

        {/* Building Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Building Type*</label>
          <select
            {...register('buildingType')}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select building type</option>
            {buildingTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.buildingType && (
            <p className="mt-1 text-sm text-red-600">{errors.buildingType.message}</p>
          )}
        </div>

        {/* Operators (Checkbox group) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Operators*</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Controller
              name="operators"
              control={control}
              render={({ field }) => (
                <>
                  {commonOperators.map((operator) => (
                    <div key={operator} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`operator-${operator}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        value={operator}
                        onChange={(e) => {
                          const value = e.target.value;
                          const isChecked = e.target.checked;
                          const currentValues = field.value || [];
                          
                          if (isChecked) {
                            field.onChange([...currentValues, value]);
                          } else {
                            field.onChange(currentValues.filter((v) => v !== value));
                          }
                        }}
                        checked={field.value?.includes(operator) || false}
                      />
                      <label htmlFor={`operator-${operator}`} className="ml-2 text-sm text-gray-700">
                        {operator}
                      </label>
                    </div>
                  ))}
                </>
              )}
            />
          </div>
          {errors.operators && (
            <p className="mt-1 text-sm text-red-600">{errors.operators.message}</p>
          )}
        </div>

        {/* Building Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Building Photos (Max 5)</label>
          <Controller
            name="buildingPhotos"
            control={control}
            render={({ field }) => (
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => {
                  // Pass the FileList to the form
                  field.onChange(e.target.files);
                }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">Upload up to 5 photos (JPG, PNG, GIF, WebP). Max 10MB each.</p>
          {errors.buildingPhotos && (
            <p className="mt-1 text-sm text-red-600">{errors.buildingPhotos.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuildingForm;
