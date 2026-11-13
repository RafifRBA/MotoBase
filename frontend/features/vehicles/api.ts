import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { ListParams } from "@/types/api";
import type { ServiceOrder, Vehicle } from "@/types/models";

export interface VehicleInput {
  customerId: string;
  licensePlate: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;
}

export const vehiclesApi = {
  list: (p: ListParams) => apiList<Vehicle>("/vehicles", p),
  get: (id: string) => apiGet<Vehicle>(`/vehicles/${id}`),
  create: (b: VehicleInput) => apiPost<Vehicle>("/vehicles", b),
  update: (id: string, b: Partial<VehicleInput>) => apiPatch<Vehicle>(`/vehicles/${id}`, b),
  orders: (id: string, p: ListParams) => apiList<ServiceOrder>(`/vehicles/${id}/service-orders`, p),
};
