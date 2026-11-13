import type { Role, ServiceStatus } from "@/types/models";
import type { Tone } from "@/components/ui/badge";

export const STATUS_FLOW: ServiceStatus[] = ["ANTRE", "DIPERIKSA", "DIKERJAKAN", "SELESAI", "DIAMBIL"];
export const ALL_STATUSES: ServiceStatus[] = [...STATUS_FLOW, "DIBATALKAN"];

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  ANTRE: "Antre",
  DIPERIKSA: "Diperiksa",
  DIKERJAKAN: "Dikerjakan",
  SELESAI: "Selesai",
  DIAMBIL: "Diambil",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_TONE: Record<ServiceStatus, Tone> = {
  ANTRE: "gray",
  DIPERIKSA: "blue",
  DIKERJAKAN: "amber",
  SELESAI: "green",
  DIAMBIL: "violet",
  DIBATALKAN: "red",
};

export function nextStatus(s: ServiceStatus): ServiceStatus | null {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
}

/** Status yang masih bisa dibatalkan / diubah isinya (belum selesai). */
export const isOpenStatus = (s: ServiceStatus) => s === "ANTRE" || s === "DIPERIKSA" || s === "DIKERJAKAN";
export const isFinalStatus = (s: ServiceStatus) => s === "DIAMBIL" || s === "DIBATALKAN";

export const ROLE_LABEL: Record<Role, string> = { OWNER: "Pemilik", ADMIN: "Kasir / Admin", MECHANIC: "Mekanik", CUSTOMER: "Pelanggan" };

export const PAYMENT_METHODS = [
  { value: "TUNAI", label: "Tunai" },
  { value: "TRANSFER", label: "Transfer bank" },
  { value: "QRIS", label: "QRIS" },
] as const;

export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number]["value"];

export const UNPAID = "BELUM_DIBAYAR";
