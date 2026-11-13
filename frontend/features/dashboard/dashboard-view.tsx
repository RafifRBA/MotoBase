"use client";

import Link from "next/link";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { PageHeader, Spinner } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/link-button";
import { useCan } from "@/components/role-gate";
import { useAuth } from "@/features/auth/auth-provider";
import { useOrders } from "@/features/service-orders/hooks";
import { useReport } from "@/features/reports/hooks";
import { useLowStock } from "@/features/spare-parts/hooks";
import { ROLE_LABEL, STATUS_LABEL } from "@/lib/constants";
import { formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { isPopulated } from "@/lib/refs";
import type { ServiceStatus } from "@/types/models";

const BOARD: ServiceStatus[] = ["ANTRE", "DIPERIKSA", "DIKERJAKAN"];

function StatusColumn({ status }: { status: ServiceStatus }) {
  const q = useOrders({ status, limit: 5 });
  const items = q.data?.items ?? [];
  return (
    <Card>
      <CardHeader title={STATUS_LABEL[status]} action={<span className="text-2xl font-semibold text-slate-900">{q.isLoading ? "…" : q.data?.meta.total ?? 0}</span>} />
      {q.isLoading ? (
        <div className="flex justify-center py-6"><Spinner className="size-5" /></div>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500">Tidak ada servis.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((o) => (
            <li key={o.id}>
              <Link href={`/service-orders/${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <span className="w-10 text-lg font-bold text-slate-900">{String(o.queueNumber).padStart(3, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{isPopulated(o.vehicleId) ? o.vehicleId.licensePlate : o.orderNumber}</span>
                  <span className="block truncate text-xs text-slate-500">{o.complaint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LowStockCard() {
  const q = useLowStock({ limit: 5 });
  const items = q.data?.items ?? [];
  return (
    <Card>
      <CardHeader title="Stok menipis" description="Segera pesan sebelum kehabisan" action={<Link href="/spare-parts" className="text-sm font-medium text-brand-700 hover:underline">Lihat semua</Link>} />
      {q.isLoading ? (
        <div className="flex justify-center py-6"><Spinner className="size-5" /></div>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-500">Semua stok masih aman.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <Link href={`/spare-parts/${p.id}`} className="text-sm font-medium text-slate-900 hover:underline">{p.name}</Link>
              <span className="text-sm text-amber-700">{p.currentStock} / min {p.minimumStock} {p.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RevenueCard() {
  const q = useReport("revenue-summary", {});
  const d = q.data as { totalPendapatan?: number; jumlahTransaksi?: number } | undefined;
  return (
    <StatCard
      label="Total pendapatan"
      value={q.isLoading ? "…" : formatRupiah(d?.totalPendapatan ?? 0)}
      hint={d?.jumlahTransaksi != null ? `${d.jumlahTransaksi} transaksi` : undefined}
    />
  );
}

export function DashboardView() {
  const { user } = useAuth();
  const canStock = useCan(ACCESS.stockRead);
  const isOwner = useCan(ACCESS.reportsOwnerOnly);
  const canCreate = useCan(ACCESS.orderCreate);
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title={`Halo, ${user?.name.split(" ")[0] ?? ""}`}
        description={`${ROLE_LABEL[user!.role]} · ${today}`}
        actions={canCreate && <LinkButton href="/service-orders/new">Servis baru</LinkButton>}
      />
      {isOwner && <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><RevenueCard /></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        {BOARD.map((s) => <StatusColumn key={s} status={s} />)}
      </div>
      {canStock && <div className="mt-6 max-w-2xl"><LowStockCard /></div>}
    </>
  );
}
