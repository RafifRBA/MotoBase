import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { Customer, ServiceOrder, Vehicle } from "@/types/models";

export interface ServiceRequestInput { vehicleId: string; complaint: string; serviceDate: string }
export const customerPortalApi = {
  profile: () => apiGet<Customer>("/customer/me"),
  vehicles: () => apiList<Vehicle>("/customer/vehicles", { limit: 100 }),
  addVehicle: (body: Omit<Vehicle, "id" | "customerId" | "createdAt">) => apiPost<Vehicle>("/customer/vehicles", body),
  orders: () => apiList<ServiceOrder>("/customer/service-orders", { limit: 100 }),
  requestService: (body: ServiceRequestInput) => apiPost<ServiceOrder>("/customer/service-requests", body),
};
export const serviceRequestsApi = {
  list: () => apiList<ServiceOrder>("/service-requests", { limit: 100 }),
  review: (id: string, body: { decision: "DITERIMA" | "DITOLAK"; serviceCost?: number; mechanicId?: string; note?: string }) => apiPatch<ServiceOrder>(`/service-requests/${id}`, body),
};
