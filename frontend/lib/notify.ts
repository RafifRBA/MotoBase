import { toast } from "sonner";
import { describeError } from "@/lib/api";

export const notifyError = (e: unknown) => {
  toast.error(describeError(e));
};
export const notifySuccess = (message: string) => {
  toast.success(message);
};
