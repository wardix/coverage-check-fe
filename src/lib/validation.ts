import { z } from 'zod';

// Create a custom validator for file inputs that works in both browser and Node.js environments
const fileSchema = z.any()
  .refine(value => {
    // Skip validation during SSR/build where FileList is not available
    if (typeof window === 'undefined') return true;
    
    // In browser, validate properly
    if (!value) return true;
    
    // Check if it's a FileList or an array of Files
    const isFileList = value instanceof FileList;
    const isFileArray = Array.isArray(value) && 
      value.every(item => item instanceof File);
    
    return isFileList || isFileArray;
  }, "Please provide valid files")
  .refine(value => {
    // Skip validation during SSR/build
    if (typeof window === 'undefined') return true;
    
    // In browser
    if (!value) return true;
    
    // Get length properly regardless of type
    const length = value instanceof FileList 
      ? value.length 
      : (Array.isArray(value) ? value.length : 0);
    
    return length <= 5;
  }, "Maximum 5 photos allowed");

export const formSchema = z.object({
  salesmanName: z.string().min(1, 'Salesman name is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerAddress: z.string().min(1, 'Customer address is required'),
  customerHomeNo: z.string().min(1, 'Customer Home Number is required'),
  village: z.string().min(1, 'Village name is required'),
  coordinates: z.string().min(1, 'Coordinates are required'),
  buildingType: z.string().min(1, 'Building type is required'),
  operators: z.array(z.string()).min(1, 'At least one operator is required'),
  buildingPhotos: fileSchema.optional(),
});

export type FormValues = z.infer<typeof formSchema>;
