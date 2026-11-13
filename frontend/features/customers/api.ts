import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { ListParams } from "@/types/api";
import type { Customer, ServiceOrder, Vehicle } from "@/types/models";

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export const customersApi = {
  list: (p: ListParams) => apiList<Customer>("/customers", p),
  get: (id: string) => apiGet<Customer>(`/customers/${id}`),
  create: (b: CustomerInput) => apiPost<Customer>("/customers", b),
  update: (id: string, b: Partial<CustomerInput>) => apiPatch<Customer>(`/customers/${id}`, b),
  vehicles: (id: string) => apiList<Vehicle>(`/customers/${id}/vehicles`),
  orders: (id: string, p: ListParams) => apiList<ServiceOrder>(`/customers/${id}/service-orders`, p),
};
