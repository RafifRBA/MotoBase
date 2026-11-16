import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { ListParams } from "@/types/api";
import type { PaymentMethodValue } from "@/lib/constants";
import type { ServiceOrder, ServiceStatus } from "@/types/models";

export interface CreateOrderInput {
  customerId: string;
  vehicleId: string;
  complaint: string;
  serviceCost?: number;
  assignedMechanicId?: string;
}

const base = (id: string) => `/service-orders/${id}`;

export const ordersApi = {
  list: (p: ListParams) => apiList<ServiceOrder>("/service-orders", p),
  get: (id: string) => apiGet<ServiceOrder>(base(id)),
  create: (b: CreateOrderInput) => apiPost<ServiceOrder>("/service-orders", b),
  update: (id: string, b: { complaint?: string; diagnosis?: string; serviceCost?: number }) => apiPatch<ServiceOrder>(base(id), b),
  assignMechanic: (id: string, mechanicId: string | null) => apiPatch<ServiceOrder>(`${base(id)}/assign-mechanic`, { mechanicId }),
  setStatus: (id: string, b: { status: ServiceStatus; note?: string; isCorrection?: boolean }) => apiPatch<ServiceOrder>(`${base(id)}/status`, b),
  addPart: (id: string, b: { sparePartId: string; quantity: number }, key?: string) => apiPost<ServiceOrder>(`${base(id)}/parts`, b, key),
  removePart: (id: string, usageId: string) => apiDelete<ServiceOrder>(`${base(id)}/parts/${usageId}`),
  /** Cek nama field pada backend/docs/API.md jika ditolak (400 VALIDATION_ERROR). */
  pay: (id: string, b: { method: PaymentMethodValue }) => apiPost<ServiceOrder>(`${base(id)}/payment`, b),
  rotateTracking: (id: string) => apiPost<{ trackingToken?: string }>(`${base(id)}/rotate-tracking-token`),
  revokeTracking: (id: string) => apiPost<unknown>(`${base(id)}/revoke-tracking-token`),
  resendReceipt: (id: string) => apiPost<ServiceOrder>(`${base(id)}/resend-receipt`),
};
