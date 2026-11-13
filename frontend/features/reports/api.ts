import { apiGet } from "@/lib/api";
import type { Role } from "@/types/models";

export type ReportKey = "service-summary" | "revenue-summary" | "parts-usage" | "low-stock" | "mechanic-performance";

export const REPORTS: { key: ReportKey; label: string; description: string; roles: Role[]; dateRange: boolean }[] = [
  { key: "service-summary", label: "Ringkasan servis", description: "Jumlah servis per status dan rata-rata durasi.", roles: ["OWNER", "ADMIN"], dateRange: true },
  { key: "revenue-summary", label: "Pendapatan", description: "Pendapatan jasa dan suku cadang.", roles: ["OWNER"], dateRange: true },
  { key: "parts-usage", label: "Pemakaian suku cadang", description: "Suku cadang yang paling banyak terpakai.", roles: ["OWNER", "ADMIN"], dateRange: true },
  { key: "low-stock", label: "Stok menipis", description: "Kekurangan terhadap batas minimum.", roles: ["OWNER", "ADMIN"], dateRange: false },
  { key: "mechanic-performance", label: "Kinerja mekanik", description: "Jumlah servis dan durasi rata-rata per mekanik.", roles: ["OWNER"], dateRange: true },
];

export const reportsApi = {
  get: (key: ReportKey, params: { from?: string; to?: string }) => apiGet<unknown>(`/reports/${key}`, params),
};
