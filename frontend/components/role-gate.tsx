"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { hasRole } from "@/lib/permissions";
import { EmptyState } from "@/components/ui/states";
import type { Role } from "@/types/models";

export function useCan(allowed: readonly Role[]) {
  const { user } = useAuth();
  return hasRole(user?.role, allowed);
}

export function RoleGate({ allow, children }: { allow: readonly Role[]; children: ReactNode }) {
  const can = useCan(allow);
  if (!can) {
    return <EmptyState title="Akses ditolak" description="Peran akun Anda tidak diizinkan membuka halaman ini." />;
  }
  return <>{children}</>;
}
