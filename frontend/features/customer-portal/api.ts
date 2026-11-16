import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { Customer, Ref, ServiceOrder, Vehicle } from "@/types/models";

export type RequestStatus = "MENUNGGU_VERIFIKASI" | "DITERIMA" | "DITOLAK";

/** Pengajuan servis dari pelanggan. Baru menjadi servis (order) setelah diterima admin. */
export interface ServiceRequest {
  id: string;
  customerId: Ref<{ name?: string; phone?: string }>;
  vehicleId: Ref<{ licensePlate?: string; brand?: string; model?: string }>;
  complaint: string;
  serviceDate: string;
  requestStatus: RequestStatus;
  reviewNote: string | null;
  orderId: string | null;
  createdAt: string;
}

export interface ServiceRequestInput { vehicleId: string; complaint: string; serviceDate: string }
export const customerPortalApi = {
  profile: () => apiGet<Customer>("/customer/me"),
  updateProfile: (body: { name?: string; phone?: string; address?: string }) => apiPatch<Customer>("/customer/me", body),
  vehicles: () => apiList<Vehicle>("/customer/vehicles", { limit: 100 }),
  addVehicle: (body: Omit<Vehicle, "id" | "customerId" | "createdAt">) => apiPost<Vehicle>("/customer/vehicles", body),
  orders: () => apiList<ServiceOrder>("/customer/service-orders", { limit: 100 }),
  requests: () => apiList<ServiceRequest>("/customer/service-requests", { limit: 100 }),
  requestService: (body: ServiceRequestInput) => apiPost<ServiceRequest>("/customer/service-requests", body),
};
export const serviceRequestsApi = {
  list: () => apiList<ServiceRequest>("/service-requests", { limit: 100 }),
  review: (id: string, body: { decision: "DITERIMA" | "DITOLAK"; serviceCost?: number; mechanicId?: string; note?: string }) => apiPatch<ServiceRequest>(`/service-requests/${id}`, body),
};
