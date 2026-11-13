import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { ListParams } from "@/types/api";
import { usersApi } from "./api";

export const useUsers = (params: ListParams, enabled = true) =>
  useQuery({ queryKey: ["users", "list", params], queryFn: () => usersApi.list(params), placeholderData: keepPreviousData, enabled });

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess("Akun staf dibuat");
    },
    onError: notifyError,
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name?: string; email?: string; phone?: string }) => usersApi.update(id, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess("Akun diperbarui");
    },
    onError: notifyError,
  });
}

export function useSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => usersApi.setStatus(v.id, v.isActive),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      notifySuccess(v.isActive ? "Akun diaktifkan" : "Akun dinonaktifkan");
    },
    onError: notifyError,
  });
}
