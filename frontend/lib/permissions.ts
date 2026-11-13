import type { Role } from "@/types/models";

const ALL: Role[] = ["OWNER", "ADMIN", "MECHANIC"];

/** Mengikuti tabel peran pada laporan Bab 5. Ini hanya untuk UX; otorisasi sebenarnya di server. */
export const ACCESS = {
  all: ALL,
  customer: ["CUSTOMER"],
  customersRead: ["ADMIN", "OWNER"],
  customersWrite: ["ADMIN"],
  vehiclesWrite: ["ADMIN"],
  usersRead: ["OWNER", "ADMIN"],
  usersWrite: ["OWNER"],
  orderCreate: ["ADMIN"],
  orderEdit: ["ADMIN", "MECHANIC"],
  orderAssign: ["ADMIN"],
  orderParts: ["ADMIN", "MECHANIC"],
  orderPay: ["ADMIN"],
  orderTracking: ["ADMIN"],
  stockRead: ["ADMIN", "OWNER"],
  stockWrite: ["ADMIN"],
  reports: ["OWNER", "ADMIN"],
  reportsOwnerOnly: ["OWNER"],
} satisfies Record<string, Role[]>;

export const ROLE_HOME: Record<Role, string> = { OWNER: "/dashboard", ADMIN: "/dashboard", MECHANIC: "/dashboard", CUSTOMER: "/my-dashboard" };

export const hasRole = (role: Role | undefined, allowed: readonly Role[]) => !!role && allowed.includes(role);
