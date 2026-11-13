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
import { useAuth } from "@/features/auth/auth-provider";
import { useDebounce } from "@/lib/hooks";
import { formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { SparePart } from "@/types/models";
import { useLowStock, useSaveSparePart, useSpareParts } from "./hooks";
import { SparePartForm } from "./spare-part-form";
import { StockBadge } from "./stock-badge";

export function SparePartList() {
  const router = useRouter();
  const { user } = useAuth();
  const canWrite = useCan(ACCESS.stockWrite);
  const canSeeLow = useCan(ACCESS.stockRead);
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [onlyLow, setOnlyLow] = useState(false);
  const [creating, setCreating] = useState(false);
  const search = useDebounce(term.trim());
  const all = useSpareParts({ page, limit: 15, search }, !onlyLow);
  const low = useLowStock({ page, limit: 15, search }, onlyLow);
  const q = onlyLow ? low : all;
  const save = useSaveSparePart();
  const showCost = user?.role === "OWNER";

  return (
    <>
      <PageHeader
        title="Suku cadang"
        description="Katalog dan sisa stok. Stok berkurang otomatis saat mekanik mencatat pemakaian."
        actions={canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Suku cadang baru</Button>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <SearchInput className="w-full max-w-sm" placeholder="Cari nama atau SKU" value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} />
          {canSeeLow && (
            <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-sm" role="group" aria-label="Filter stok">
              {[{ v: false, l: "Semua" }, { v: true, l: "Stok menipis" }].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  aria-pressed={onlyLow === o.v}
                  onClick={() => { setOnlyLow(o.v); setPage(1); }}
                  className={cn("rounded-md px-3 py-1.5 font-medium", onlyLow === o.v ? "bg-asphalt-900 text-white" : "text-slate-600 hover:bg-slate-100")}
                >
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </div>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            loading={q.isLoading}
            rows={q.data?.items ?? []}
            rowKey={(p) => p.id}
            onRowClick={(p) => router.push(`/spare-parts/${p.id}`)}
            emptyTitle={onlyLow ? "Tidak ada stok yang menipis" : "Suku cadang tidak ditemukan"}
            columns={[
              { header: "SKU", cell: (p) => <span className="text-slate-500">{p.sku}</span> },
              { header: "Nama", cell: (p) => <span className="font-medium text-slate-900">{p.name}</span> },
              { header: "Kategori", cell: (p) => p.category },
              { header: "Harga jual", className: "text-right", cell: (p) => formatRupiah(p.sellingPrice) },
              ...(showCost ? [{ header: "Harga modal", className: "text-right", cell: (p: SparePart) => formatRupiah(p.purchasePrice) }] : []),
              { header: "Stok", cell: (p) => <StockBadge part={p} /> },
            ]}
          />
        )}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Suku cadang baru" size="lg">
        <SparePartForm
          loading={save.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await save.mutateAsync(body).catch(() => null);
            if (created) {
              setCreating(false);
              router.push(`/spare-parts/${created.id}`);
            }
          }}
        />
      </Modal>
    </>
  );
}
