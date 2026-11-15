import type { Role } from "./api";

export type ServiceStatus =
  | "ANTRE"
  | "DIPERIKSA"
  | "DIKERJAKAN"
  | "SELESAI"
  | "DIAMBIL"
  | "DIBATALKAN";

/** Relasi bisa berupa id mentah atau objek hasil populate. */
export type Ref<T = object> = string | (T & { id: string });
export type NamedRef = Ref<{ name?: string; phone?: string }>;
export type VehicleRef = Ref<{ licensePlate?: string; brand?: string; model?: string }>;

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: NamedRef;
  licensePlate: string;
  brand: string;
  model: string;
  year?: number | null;
  color?: string | null;
  createdAt?: string;
}

export interface SparePart {
  id: string;
  sku: string;
  name: string;
  category: string;
  sellingPrice: number;
  /** Hanya dikirim backend untuk OWNER. */
  purchasePrice?: number;
  currentStock: number;
  minimumStock: number;
  unit: string;
  isActive: boolean;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  sparePartId: Ref<{ name?: string; sku?: string }>;
  type: string;
  /** Selalu positif. Untuk tampilan bertanda pakai `delta`. */
  quantity: number;
  /** Selisih bertanda (stockAfter - stockBefore). */
  delta?: number;
  stockBefore?: number;
  stockAfter?: number;
  note?: string | null;
  createdBy?: NamedRef | null;
  createdAt: string;
}

export interface UsedPart {
  id?: string;
  usageId?: string;
  sparePartId?: Ref<{ name?: string; sku?: string }>;
  name?: string;
  sku?: string;
  quantity: number;
  unitPrice?: number;
  sellingPrice?: number;
  subtotal?: number;
  isCancelled?: boolean;
  cancelledAt?: string | null;
}

export interface StatusHistoryEntry {
  from: ServiceStatus | null;
  to: ServiceStatus;
  changedBy: NamedRef | null;
  changedAt: string;
  note: string | null;
  isCorrection: boolean;
}

export interface ServiceOrder {
  id: string;
  orderNumber: string;
  queueNumber: number;
  serviceDate: string;
  customerId: NamedRef;
  vehicleId: VehicleRef;
  assignedMechanicId: NamedRef | null;
  complaint: string;
  diagnosis: string | null;
  currentStatus: ServiceStatus;
  serviceCost: number;
  partsSubtotal: number;
  grandTotal: number;
  paymentStatus: string;
  paymentMethod: string | null;
  paidAt: string | null;
  usedParts: UsedPart[];
  statusHistory: StatusHistoryEntry[];
  completedAt: string | null;
  pickedUpAt: string | null;
  cancelledAt: string | null;
  trackingActive: boolean;
  trackingToken?: string;
}

export interface CustomerProfile extends Customer {
  userId: string;
}

export interface TrackingView {
  orderNumber: string;
  queueNumber: number;
  serviceDate: string;
  vehicle: { licensePlate: string; brand: string; model: string };
  customerName: string;
  complaint: string;
  currentStatus: ServiceStatus;
  mechanic: { name: string } | null;
  statusHistory: { status: ServiceStatus; timestamp: string }[];
  serviceCost?: number;
  partsSubtotal?: number;
  grandTotal?: number;
  paymentStatus?: string;
  usedSpareParts?: { name?: string; quantity: number; unitPrice?: number; subtotal?: number }[];
}

export type { Role };
