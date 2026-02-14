import { toast as sonnerToast } from "sonner";

type ToastProps = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
};

export const useToast = () => {
  return {
    toast: ({ title, description, variant, ...props }: ToastProps) => {
      if (variant === "destructive") {
        sonnerToast.error(title, {
          description,
          ...props,
        });
      } else {
        sonnerToast(title, {
          description,
          ...props,
        });
      }
    },
    dismiss: (toastId?: string) => sonnerToast.dismiss(toastId),
  };
};
