import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ListParams } from "@/types/api";
import { sparePartsApi, type SparePartInput } from "./api";

export const useSpareParts = (params: ListParams, enabled = true) =>
  useQuery({ queryKey: ["spare-parts", "list", params], queryFn: () => sparePartsApi.list(params), placeholderData: keepPreviousData, enabled });

export const useLowStock = (params: ListParams = { limit: 20 }, enabled = true) =>
  useQuery({ queryKey: ["spare-parts", "low-stock", params], queryFn: () => sparePartsApi.lowStock(params), placeholderData: keepPreviousData, enabled });

export const useSparePart = (id: string) =>
  useQuery({ queryKey: ["spare-parts", "detail", id], queryFn: () => sparePartsApi.get(id), enabled: !!id });

export const useSparePartMovements = (id: string, params: ListParams, enabled = true) =>
  useQuery({ queryKey: ["spare-parts", "movements", id, params], queryFn: () => sparePartsApi.movements(id, params), placeholderData: keepPreviousData, enabled });

export const useAllMovements = (params: ListParams) =>
  useQuery({ queryKey: ["stock-movements", params], queryFn: () => sparePartsApi.allMovements(params), placeholderData: keepPreviousData });

function useInvalidateStock() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["spare-parts"] });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
}

export function useSaveSparePart(id?: string) {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (body: SparePartInput) => {
      if (id) {
        const { initialStock: _i, sku: _s, ...rest } = body;
        void _i;
        void _s;
        return sparePartsApi.update(id, rest);
      }
      return sparePartsApi.create(body);
    },
    onSuccess: () => {
      invalidate();
      notifySuccess(id ? "Suku cadang diperbarui" : "Suku cadang terdaftar");
    },
    onError: notifyError,
  });
}

export function useStockIn(id: string) {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (b: { quantity: number; note?: string }) => sparePartsApi.stockIn(id, b),
    onSuccess: () => {
      invalidate();
      notifySuccess("Stok masuk tercatat");
    },
    onError: notifyError,
  });
}

export function useAdjustStock(id: string) {
  const invalidate = useInvalidateStock();
  return useMutation({
    mutationFn: (b: { newStock: number; note?: string }) => sparePartsApi.adjustStock(id, b),
    onSuccess: () => {
      invalidate();
      notifySuccess("Stok disesuaikan");
    },
    onError: notifyError,
  });
}
