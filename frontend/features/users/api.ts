import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api";
import type { ListParams } from "@/types/api";
import type { Role, User } from "@/types/models";

export interface UserInput {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: Role;
}

export const usersApi = {
  list: (p: ListParams) => apiList<User>("/users", p),
  get: (id: string) => apiGet<User>(`/users/${id}`),
  create: (b: Required<Pick<UserInput, "name" | "email" | "password" | "role">> & { phone?: string }) => apiPost<User>("/users", b),
  update: (id: string, b: { name?: string; email?: string; phone?: string }) => apiPatch<User>(`/users/${id}`, b),
  setStatus: (id: string, isActive: boolean) => apiPatch<User>(`/users/${id}/status`, { isActive }),
};
