import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { ListParams } from "@/types/api";
import type { SparePart, StockMovement } from "@/types/models";

export interface SparePartInput {
  sku: string;
  name: string;
  category: string;
  sellingPrice: number;
  purchasePrice?: number;
  initialStock?: number;
  minimumStock: number;
  unit: string;
}

export const sparePartsApi = {
  list: (p: ListParams) => apiList<SparePart>("/spare-parts", p),
  lowStock: (p: ListParams) => apiList<SparePart>("/spare-parts/low-stock", p),
  get: (id: string) => apiGet<SparePart>(`/spare-parts/${id}`),
  create: (b: SparePartInput) => apiPost<SparePart>("/spare-parts", b),
  update: (id: string, b: Partial<Omit<SparePartInput, "initialStock" | "sku">>) => apiPatch<SparePart>(`/spare-parts/${id}`, b),
  /** Cek nama field pada backend/docs/API.md jika backend menolak (400 VALIDATION_ERROR). */
  stockIn: (id: string, b: { quantity: number; note?: string }) => apiPost<SparePart>(`/spare-parts/${id}/stock-in`, b),
  adjustStock: (id: string, b: { newStock: number; note?: string }) => apiPost<SparePart>(`/spare-parts/${id}/adjust-stock`, b),
  movements: (id: string, p: ListParams) => apiList<StockMovement>(`/spare-parts/${id}/movements`, p),
  allMovements: (p: ListParams) => apiList<StockMovement>("/stock-movements", p),
};
