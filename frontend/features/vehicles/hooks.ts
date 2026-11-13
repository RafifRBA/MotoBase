import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ListParams } from "@/types/api";
import { vehiclesApi, type VehicleInput } from "./api";

export const useVehicles = (params: ListParams) =>
  useQuery({ queryKey: ["vehicles", "list", params], queryFn: () => vehiclesApi.list(params), placeholderData: keepPreviousData });

export const useVehicle = (id: string, enabled = true) =>
  useQuery({ queryKey: ["vehicles", "detail", id], queryFn: () => vehiclesApi.get(id), enabled: !!id && enabled });

export const useVehicleOrders = (id: string, params: ListParams) =>
  useQuery({ queryKey: ["vehicles", "orders", id, params], queryFn: () => vehiclesApi.orders(id, params), placeholderData: keepPreviousData });

export function useSaveVehicle(id?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<VehicleInput> & Pick<VehicleInput, "customerId">) =>
      id ? vehiclesApi.update(id, body) : vehiclesApi.create(body as VehicleInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["customers", "vehicles"] });
      notifySuccess(id ? "Data kendaraan diperbarui" : "Kendaraan terdaftar");
    },
    onError: notifyError,
  });
}
