import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ListParams } from "@/types/api";
import { customersApi, type CustomerInput } from "./api";

export const useCustomers = (params: ListParams, enabled = true) =>
  useQuery({ queryKey: ["customers", "list", params], queryFn: () => customersApi.list(params), placeholderData: keepPreviousData, enabled });

export const useCustomer = (id: string, enabled = true) =>
  useQuery({ queryKey: ["customers", "detail", id], queryFn: () => customersApi.get(id), enabled: !!id && enabled });

export const useCustomerVehicles = (id?: string) =>
  useQuery({ queryKey: ["customers", "vehicles", id], queryFn: () => customersApi.vehicles(id!), enabled: !!id });

export const useCustomerOrders = (id: string, params: ListParams) =>
  useQuery({ queryKey: ["customers", "orders", id, params], queryFn: () => customersApi.orders(id, params), placeholderData: keepPreviousData });

export function useSaveCustomer(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CustomerInput) => (id ? customersApi.update(id, body) : customersApi.create(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      notifySuccess(id ? "Data pelanggan diperbarui" : "Pelanggan terdaftar");
    },
    onError: notifyError,
  });
}
