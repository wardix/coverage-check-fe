"use client";

import { FormValues, formSchema } from "@/lib/validation";
import { apiService } from "@/services/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import Skeleton from "react-loading-skeleton";
import { toast } from "react-toastify";
import SearchableDropdown from "./SearchableDropdown";

const MAX_FILE_SIZE_TOTAL = 10 * 1024 * 1024; // 10 MB in bytes

const OrderForm = () => {
  const [salesmen, setSalesmen] = useState<string[]>([]);
  const [buildingTypes, setBuildingTypes] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
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
      coordinates: "",
      village: "",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Only fetch building types on initial load
        // For salesmen, we'll just fetch initially with empty search
        const buildingTypesData = await apiService.getBuildingTypes();
        setBuildingTypes(buildingTypesData);

        // Get initial salesmen list (could be limited to top results)
        const salesmenData = await apiService.searchSalesmen("");
        setSalesmen(salesmenData);

        // Get initial villages list
        const villagesData = await apiService.searchVillages("");
        setVillages(villagesData);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load form data. Please refresh the page.");
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
      formData.append("salesmanName", data.salesmanName);
      formData.append("customerName", data.customerName);
      formData.append("customerAddress", data.customerAddress);
      formData.append("customerHomeNo", data.customerHomeNo);
      formData.append("village", data.village);
      formData.append("coordinates", data.coordinates);
      formData.append("buildingType", data.buildingType);
      formData.append("remarks", data.remarks);

      // Append operators as multiple values
      data.operators.forEach((operator) => {
        formData.append("operators", operator);
      });

      // Append photos if any
      if (data.buildingPhotos) {
        const files = data.buildingPhotos as FileList;

        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            formData.append("buildingPhotos", files[i]);
          }
        }
      }

      const response = await apiService.submitForm(formData);

      if (response.success) {
        toast.success("Form submitted successfully!");
        router.push(`/success?id=${response.submissionId}`);
      } else {
        toast.error(response.message || "Failed to submit form");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to submit form";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common operators for selection
  const commonOperators = ["CGS", "FS", "SIP"];

  // Function to get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Format the coordinates as "latitude,longitude"
        const coordinates = `${position.coords.latitude},${position.coords.longitude}`;

        // Use React Hook Form's setValue method to properly update the form state
        setValue("coordinates", coordinates, {
          shouldValidate: true,
          shouldDirty: true,
          shouldTouch: true,
        });

        setIsLoading(false);
        toast.success("Location captured successfully");
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Unable to retrieve your location");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Skeleton height={50} className="mb-6" />
        <Skeleton height={40} className="mb-4" count={7} />
        <Skeleton height={100} className="mb-4" />
        <Skeleton height={60} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Order Information Form</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Salesman Selection - Now using SearchableDropdown with server search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Salesman Name*
          </label>
          <Controller
            name="salesmanName"
            control={control}
            render={({ field }) => (
              <SearchableDropdown
                options={salesmen}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select a salesman"
                isLoading={isLoading}
                id="salesmanName"
                serverSearchEnabled={true}
                debounceTime={500}
                onSearch={async (query) => {
                  // Don't search if the query is less than 2 characters
                  if (query.trim().length < 2 && query.trim().length > 0) {
                    return;
                  }

                  try {
                    const results = await apiService.searchSalesmen(query);
                    setSalesmen(results);
                  } catch (error) {
                    console.error("Error searching salesmen:", error);
                    toast.error("Failed to search salesmen");
                  }
                }}
              />
            )}
          />
          {errors.salesmanName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.salesmanName.message?.toString()}
            </p>
          )}
        </div>

        {/* Building Type Selection - Using regular SearchableDropdown (local filtering) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building Type*
          </label>
          <Controller
            name="buildingType"
            control={control}
            render={({ field }) => (
              <SearchableDropdown
                options={buildingTypes}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select building type"
                isLoading={isLoading}
                id="buildingType"
              />
            )}
          />
          {errors.buildingType && (
            <p className="mt-1 text-sm text-red-600">
              {errors.buildingType.message?.toString()}
            </p>
          )}
        </div>

        {/* Customer Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name*
          </label>
          <input
            type="text"
            {...register("customerName")}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.customerName && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerName.message?.toString()}
            </p>
          )}
        </div>

        {/* Customer Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Address*
          </label>
          <textarea
            {...register("customerAddress")}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.customerAddress && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerAddress.message?.toString()}
            </p>
          )}
        </div>

        {/* Customer Home No */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Home No*
          </label>
          <input
            type="text"
            {...register("customerHomeNo")}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.customerHomeNo && (
            <p className="mt-1 text-sm text-red-600">
              {errors.customerHomeNo.message?.toString()}
            </p>
          )}
        </div>

        {/* Village field - Now using improved SearchableDropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Village*
          </label>
          <Controller
            name="village"
            control={control}
            render={({ field }) => (
              <SearchableDropdown
                options={villages}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select or type village name"
                isLoading={isLoading}
                id="village"
                serverSearchEnabled={true}
                debounceTime={800} // Increased debounce time for village search
                onSearch={async (query) => {
                  // Don't search if the query is less than 3 characters
                  if (query.trim().length < 3 && query.trim().length > 0) {
                    return;
                  }

                  try {
                    const results = await apiService.searchVillages(query);
                    setVillages(results);
                  } catch (error) {
                    console.error("Error searching villages:", error);
                    toast.error("Failed to search villages");
                  }
                }}
              />
            )}
          />
          {errors.village && (
            <p className="mt-1 text-sm text-red-600">
              {errors.village.message?.toString()}
            </p>
          )}
        </div>

        {/* Coordinates with Get Location button */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coordinates*
          </label>
          <div className="flex gap-2">
            <input
              id="coordinates"
              type="text"
              {...register("coordinates")}
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
            <p className="mt-1 text-sm text-red-600">
              {errors.coordinates.message?.toString()}
            </p>
          )}
        </div>

        {/* Operators (Checkbox group) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Operators*
          </label>
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
                            field.onChange(
                              currentValues.filter((v) => v !== value)
                            );
                          }
                        }}
                        checked={field.value?.includes(operator) || false}
                      />
                      <label
                        htmlFor={`operator-${operator}`}
                        className="ml-2 text-sm text-gray-700"
                      >
                        {operator}
                      </label>
                    </div>
                  ))}
                </>
              )}
            />
          </div>
          {errors.operators && (
            <p className="mt-1 text-sm text-red-600">
              {errors.operators.message?.toString()}
            </p>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Remarks
          </label>
          <textarea
            {...register("remarks")}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.remarks && (
            <p className="mt-1 text-sm text-red-600">
              {errors.remarks.message?.toString()}
            </p>
          )}
        </div>

        {/* Building Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Building Photos
          </label>
          <Controller
            name="buildingPhotos"
            control={control}
            render={({ field }) => (
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/mov,video/avi,video/webm"
                onChange={(e) => {
                  // Pass the FileList to the form
                  const totalSize = Array.from(e.target.files || []).reduce(
                    (acc, file) => acc + file.size,
                    0
                  );
                  if (MAX_FILE_SIZE_TOTAL < totalSize) {
                    toast.error("Total file size exceeds the limit of 10MB.");
                  }
                  field.onChange(e.target.files);
                }}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          />
          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG, GIF, WebP. Max 10MB.
          </p>
          {errors.buildingPhotos && (
            <p className="mt-1 text-sm text-red-600">
              {errors.buildingPhotos.message?.toString()}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
