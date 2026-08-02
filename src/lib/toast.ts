import { toast } from 'sonner-native';

export const showSuccessToast = (message: string, description?: string) =>
  toast.success(message, description ? { description } : undefined);

export const showErrorToast = (message: string, description?: string) =>
  toast.error(message, description ? { description } : undefined);

export const showInfoToast = (message: string, description?: string) =>
  toast.info(message, description ? { description } : undefined);
