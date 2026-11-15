import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ListParams } from "@/types/api";
import type { PaymentMethodValue } from "@/lib/constants";
import type { ServiceStatus } from "@/types/models";
import { ordersApi, type CreateOrderInput } from "./api";

export const useOrders = (params: ListParams) =>
  useQuery({ queryKey: ["orders", "list", params], queryFn: () => ordersApi.list(params), placeholderData: keepPreviousData });

export const useOrder = (id: string) =>
  useQuery({ queryKey: ["orders", "detail", id], queryFn: () => ordersApi.get(id), enabled: !!id });

/** Mutasi servis memengaruhi stok, laporan, dan riwayat pelanggan/kendaraan. */
function useRefreshOrder(id?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["spare-parts"] });
    qc.invalidateQueries({ queryKey: ["stock-movements"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
    qc.invalidateQueries({ queryKey: ["customers", "orders"] });
    qc.invalidateQueries({ queryKey: ["vehicles", "orders"] });
    if (id) qc.invalidateQueries({ queryKey: ["orders", "detail", id] });
  };
}

export function useCreateOrder() {
  const refresh = useRefreshOrder();
  return useMutation({
    mutationFn: (b: CreateOrderInput) => ordersApi.create(b),
    onSuccess: () => {
      refresh();
      notifySuccess("Servis dicatat");
    },
    onError: notifyError,
  });
}

export function useUpdateOrder(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (b: { complaint?: string; diagnosis?: string; serviceCost?: number }) => ordersApi.update(id, b),
    onSuccess: () => {
      refresh();
      notifySuccess("Data servis disimpan");
    },
    onError: notifyError,
  });
}

export function useAssignMechanic(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (mechanicId: string | null) => ordersApi.assignMechanic(id, mechanicId),
    onSuccess: () => {
      refresh();
      notifySuccess("Penugasan mekanik disimpan");
    },
    onError: notifyError,
  });
}

export function useSetStatus(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (v: { status: ServiceStatus; note?: string }) => ordersApi.setStatus(id, v.status, v.note),
    onSuccess: () => {
      refresh();
      notifySuccess("Status servis diperbarui");
    },
    onError: notifyError,
  });
}

export function useAddPart(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (b: { sparePartId: string; quantity: number }) => ordersApi.addPart(id, b),
    onSuccess: () => {
      refresh();
      notifySuccess("Pemakaian suku cadang dicatat, stok berkurang");
    },
    onError: notifyError,
  });
}

export function useRemovePart(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (usageId: string) => ordersApi.removePart(id, usageId),
    onSuccess: () => {
      refresh();
      notifySuccess("Pemakaian dibatalkan, stok dikembalikan");
    },
    onError: notifyError,
  });
}

export function usePayOrder(id: string) {
  const refresh = useRefreshOrder(id);
  return useMutation({
    mutationFn: (paymentMethod: PaymentMethodValue) => ordersApi.pay(id, { method: paymentMethod }),
    onSuccess: () => {
      refresh();
      notifySuccess("Pembayaran tercatat");
    },
    onError: notifyError,
  });
}

export function useTrackingToken(id: string) {
  const refresh = useRefreshOrder(id);
  const rotate = useMutation({
    mutationFn: () => ordersApi.rotateTracking(id),
    onSuccess: () => {
      refresh();
      notifySuccess("Tautan pelacakan baru diterbitkan");
    },
    onError: notifyError,
  });
  const revoke = useMutation({
    mutationFn: () => ordersApi.revokeTracking(id),
    onSuccess: () => {
      refresh();
      notifySuccess("Tautan pelacakan dicabut");
    },
    onError: notifyError,
  });
  return { rotate, revoke };
}
