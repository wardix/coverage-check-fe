'use client';

import { useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

// Define form validation schema
const coverageFormSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  zipCode: z.string().min(1, 'Zip/Postal code is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(8, 'Please enter a valid phone number')
    .regex(/^[0-9+\-\s()]*$/, 'Please enter a valid phone number'),
  buildingType: z.enum(['Residential', 'Commercial', 'Industrial', 'Mixed-Use']),
  contactPreference: z.enum(['Email', 'Phone', 'Both']),
  additionalInfo: z.string().optional(),
});

type CoverageFormValues = z.infer<typeof coverageFormSchema>;

const CoverageCheckForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkResult, setCheckResult] = useState<'available' | 'unavailable' | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset
  } = useForm<CoverageFormValues>({
    resolver: zodResolver(coverageFormSchema),
    defaultValues: {
      buildingType: 'Residential',
      contactPreference: 'Email',
      additionalInfo: '',
    },
  });

  const onSubmit: SubmitHandler<CoverageFormValues> = async () => {
    setIsSubmitting(true);

    try {
      // Simulate API call with a timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, we'll randomly determine if coverage is available
      // In a real app, this would be an actual API call to check coverage
      const isCoverageAvailable = Math.random() > 0.3; // 70% chance of success
      
      setCheckResult(isCoverageAvailable ? 'available' : 'unavailable');
      
      // In a real app, you might store the request in your database
      // const response = await axios.post('/api/coverage-check', data);
      
      if (isCoverageAvailable) {
        toast.success('Coverage is available in your area!');
      } else {
        toast.info('Unfortunately, coverage is not available in your area yet.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('An error occurred while checking coverage. Please try again.');
      setCheckResult(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setCheckResult(null);
  };

  const buildingTypes = [
    'Residential',
    'Commercial',
    'Industrial',
    'Mixed-Use'
  ];

  const contactPreferences = [
    'Email',
    'Phone',
    'Both'
  ];

  return (
    <div className="bg-white shadow-md rounded-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6">Coverage Check</h2>

      {checkResult === null ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Address Field */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address*
            </label>
            <input
              id="address"
              type="text"
              {...register('address')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your full address"
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {/* Zip/Postal Code Field */}
          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
              Zip/Postal Code*
            </label>
            <input
              id="zipCode"
              type="text"
              {...register('zipCode')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter zip/postal code"
            />
            {errors.zipCode && (
              <p className="mt-1 text-sm text-red-600">{errors.zipCode.message}</p>
            )}
          </div>

          {/* Building Type */}
          <div>
            <label htmlFor="buildingType" className="block text-sm font-medium text-gray-700 mb-1">
              Building Type*
            </label>
            <Controller
              name="buildingType"
              control={control}
              render={({ field }) => (
                <select
                  id="buildingType"
                  {...field}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {buildingTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.buildingType && (
              <p className="mt-1 text-sm text-red-600">{errors.buildingType.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email*
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="yourname@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number*
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Contact Preference */}
          <div>
            <label htmlFor="contactPreference" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Contact Method*
            </label>
            <Controller
              name="contactPreference"
              control={control}
              render={({ field }) => (
                <select
                  id="contactPreference"
                  {...field}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {contactPreferences.map((preference) => (
                    <option key={preference} value={preference}>
                      {preference}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.contactPreference && (
              <p className="mt-1 text-sm text-red-600">{errors.contactPreference.message}</p>
            )}
          </div>

          {/* Additional Information */}
          <div>
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Information (Optional)
            </label>
            <textarea
              id="additionalInfo"
              {...register('additionalInfo')}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any specific requirements or comments"
            />
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
              {isSubmitting ? 'Checking Coverage...' : 'Check Coverage'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <div className={`p-4 rounded-md ${
            checkResult === 'available' 
              ? 'bg-green-100 border border-green-300' 
              : 'bg-orange-100 border border-orange-300'
          }`}>
            <div className="flex items-center">
              {checkResult === 'available' ? (
                <>
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <h3 className="text-lg font-medium text-green-800">Coverage Available!</h3>
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <h3 className="text-lg font-medium text-orange-800">Coverage Unavailable</h3>
                </>
              )}
            </div>
            
            <p className="mt-2 text-sm text-gray-700">
              {checkResult === 'available' 
                ? 'Great news! Coverage is available at your location. A representative will contact you shortly with more information.' 
                : 'Unfortunately, coverage is not available at your location at this time. We&apos;ve added your information to our waitlist and will notify you when service becomes available in your area.'}
            </p>
          </div>

          {checkResult === 'available' && (
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Next Steps</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Our team will contact you within 1-2 business days</li>
                <li>Prepare any building access information</li>
                <li>Have your ID ready for verification during installation</li>
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={handleReset}
              className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm"
            >
              Check Another Address
            </button>
            
            {checkResult === 'available' && (
              <button
                onClick={() => router.push('/schedule')}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
              >
                Schedule Installation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageCheckForm;
