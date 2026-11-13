"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";
import { ErrorState, PageHeader } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { useDebounce } from "@/lib/hooks";
import { ACCESS } from "@/lib/permissions";
import { isPopulated } from "@/lib/refs";
import { useSaveVehicle, useVehicles } from "./hooks";
import { VehicleForm } from "./vehicle-form";

export function VehicleList() {
  const router = useRouter();
  const canWrite = useCan(ACCESS.vehiclesWrite);
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebounce(term.trim());
  const q = useVehicles({ page, limit: 15, search });
  const save = useSaveVehicle();

  return (
    <>
      <PageHeader
        title="Kendaraan"
        description="Cari motor berdasarkan plat nomor."
        actions={canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Kendaraan baru</Button>}
      />
      <Card>
        <div className="border-b border-slate-200 p-4">
          <SearchInput
            className="max-w-sm"
            placeholder="Cari plat nomor, mis. AB 1234 XY"
            value={term}
            onChange={(e) => {
              setTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            loading={q.isLoading}
            rows={q.data?.items ?? []}
            rowKey={(v) => v.id}
            onRowClick={(v) => router.push(`/vehicles/${v.id}`)}
            emptyTitle="Kendaraan tidak ditemukan"
            columns={[
              { header: "Plat nomor", cell: (v) => <span className="font-semibold text-slate-900">{v.licensePlate}</span> },
              { header: "Motor", cell: (v) => `${v.brand} ${v.model}` },
              { header: "Tahun", cell: (v) => v.year ?? "-" },
              { header: "Pemilik", cell: (v) => (isPopulated(v.customerId) ? v.customerId.name ?? "-" : "-") },
            ]}
          />
        )}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Kendaraan baru" size="lg">
        <VehicleForm
          loading={save.isPending}
          submitLabel="Daftarkan"
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await save.mutateAsync(body).catch(() => null);
            if (created) {
              setCreating(false);
              router.push(`/vehicles/${created.id}`);
            }
          }}
        />
      </Modal>
    </>
  );
}
