"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, PageHeader } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { useAuth } from "@/features/auth/auth-provider";
import { ALL_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { formatDate, formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { isPopulated } from "@/lib/refs";
import { cn } from "@/lib/utils";
import type { ServiceOrder, ServiceStatus } from "@/types/models";
import { useOrders } from "../hooks";
import { VehicleInline } from "./ref-display";
import { StatusBadge } from "./status-badge";

export function OrderList() {
  const router = useRouter();
  const { user } = useAuth();
  const canCreate = useCan(ACCESS.orderCreate);
  const [status, setStatus] = useState<ServiceStatus | "">("");
  const [page, setPage] = useState(1);
  const q = useOrders({ page, limit: 15, status });
  const rows = q.data?.items ?? [];
  const showVehicle = rows.some((o) => isPopulated(o.vehicleId));

  const columns: Column<ServiceOrder>[] = [
    { header: "Antrean", cell: (o) => <span className="text-lg font-bold text-slate-900">{String(o.queueNumber).padStart(3, "0")}</span> },
    { header: "No. order", cell: (o) => <><span className="font-medium text-slate-900">{o.orderNumber}</span><span className="block text-xs text-slate-500">{formatDate(o.serviceDate)}</span></> },
    ...(showVehicle ? [{ header: "Kendaraan", cell: (o: ServiceOrder) => <VehicleInline value={o.vehicleId} lookup={false} /> }] : []),
    { header: "Keluhan", cell: (o) => <span className="line-clamp-1 max-w-xs">{o.complaint}</span> },
    { header: "Status", cell: (o) => <StatusBadge status={o.currentStatus} /> },
    { header: "Total", className: "text-right", cell: (o) => formatRupiah(o.grandTotal) },
  ];

  return (
    <>
      <PageHeader
        title={user?.role === "MECHANIC" ? "Tugas saya" : "Servis"}
        description={user?.role === "MECHANIC" ? "Daftar servis yang ditugaskan kepada Anda." : "Antrean dan riwayat servis bengkel."}
        actions={canCreate && <LinkButton href="/service-orders/new"><Plus className="size-4" aria-hidden /> Servis baru</LinkButton>}
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4" role="group" aria-label="Filter status">
          {(["", ...ALL_STATUSES] as const).map((s) => (
            <button
              key={s || "all"}
              type="button"
              aria-pressed={status === s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn("rounded-full px-3 py-1 text-sm font-medium transition-colors", status === s ? "bg-asphalt-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
            >
              {s ? STATUS_LABEL[s] : "Semua"}
            </button>
          ))}
        </div>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            loading={q.isLoading}
            rows={rows}
            rowKey={(o) => o.id}
            columns={columns}
            onRowClick={(o) => router.push(`/service-orders/${o.id}`)}
            emptyTitle="Belum ada servis"
            emptyDescription={status ? "Tidak ada servis dengan status ini." : undefined}
          />
        )}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
