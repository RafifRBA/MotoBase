import { useQuery } from "@tanstack/react-query";
import { reportsApi, type ReportKey } from "./api";

export const useReport = (key: ReportKey, params: { from?: string; to?: string }, enabled = true) =>
  useQuery({ queryKey: ["reports", key, params], queryFn: () => reportsApi.get(key, params), enabled });
