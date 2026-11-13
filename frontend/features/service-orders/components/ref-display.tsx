"use client";

import Link from "next/link";
import { useCan } from "@/components/role-gate";
import { useAuth } from "@/features/auth/auth-provider";
import { useCustomer } from "@/features/customers/hooks";
import { useVehicle } from "@/features/vehicles/hooks";
import { useUsers } from "@/features/users/hooks";
import { formatPhone } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { isPopulated, refId } from "@/lib/refs";
import type { NamedRef, VehicleRef } from "@/types/models";

/** Menampilkan pelanggan: dari data embedded, atau mengambilnya bila hanya id (khusus peran yang berhak). */
export function CustomerInline({ value, showPhone }: { value: NamedRef | null | undefined; showPhone?: boolean }) {
  const canRead = useCan(ACCESS.customersRead);
  const populated = isPopulated(value);
  const lookup = useCustomer(refId(value), !populated && canRead);
  const id = refId(value);
  const name = populated ? value.name : lookup.data?.name;
  const phone = populated ? value.phone : lookup.data?.phone;
  if (!id) return <>-</>;
  if (!name) return <span className="text-slate-500">{canRead ? "Memuat…" : "-"}</span>;
  const label = (
    <>
      <span className="font-medium">{name}</span>
      {showPhone && phone && <span className="block text-xs text-slate-500">{formatPhone(phone)}</span>}
    </>
  );
  return canRead ? <Link href={`/customers/${id}`} className="text-brand-700 hover:underline">{label}</Link> : <span>{label}</span>;
}

export function VehicleInline({ value, lookup = true }: { value: VehicleRef | null | undefined; lookup?: boolean }) {
  const populated = isPopulated(value);
  const fetched = useVehicle(refId(value), lookup && !populated);
  const id = refId(value);
  const v = populated ? value : fetched.data;
  if (!id) return <>-</>;
  if (!v?.licensePlate) return <span className="text-slate-500">{lookup ? "Memuat…" : "-"}</span>;
  return (
    <Link href={`/vehicles/${id}`} className="text-brand-700 hover:underline">
      <span className="font-semibold">{v.licensePlate}</span>
      <span className="block text-xs text-slate-500">{v.brand} {v.model}</span>
    </Link>
  );
}

export function MechanicInline({ value }: { value: NamedRef | null | undefined }) {
  const { user } = useAuth();
  const canList = useCan(ACCESS.usersRead);
  const populated = isPopulated(value);
  const id = refId(value);
  const mechanics = useUsers({ role: "MECHANIC", limit: 100 }, !!id && !populated && canList);
  if (!id) return <span className="text-slate-500">Belum ditugaskan</span>;
  if (populated && value.name) return <>{value.name}</>;
  if (user?.id === id) return <>{user.name}</>;
  const found = mechanics.data?.items.find((m) => m.id === id);
  return <>{found?.name ?? "-"}</>;
}
