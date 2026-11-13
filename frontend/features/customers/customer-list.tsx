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
import { ACCESS } from "@/lib/permissions";
import { formatPhone } from "@/lib/format";
import { useDebounce } from "@/lib/hooks";
import { CustomerForm } from "./customer-form";
import { useCustomers, useSaveCustomer } from "./hooks";

export function CustomerList() {
  const router = useRouter();
  const canWrite = useCan(ACCESS.customersWrite);
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebounce(term.trim());
  const q = useCustomers({ page, limit: 15, search });
  const save = useSaveCustomer();

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description="Data pelanggan bengkel dan kendaraannya."
        actions={canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Pelanggan baru</Button>}
      />
      <Card>
        <div className="border-b border-slate-200 p-4">
          <SearchInput
            className="max-w-sm"
            placeholder="Cari nama atau nomor telepon"
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
            rowKey={(c) => c.id}
            onRowClick={(c) => router.push(`/customers/${c.id}`)}
            emptyTitle="Pelanggan tidak ditemukan"
            emptyDescription="Coba kata kunci lain atau daftarkan pelanggan baru."
            columns={[
              { header: "Nama", cell: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
              { header: "Telepon", cell: (c) => formatPhone(c.phone) },
              { header: "Surel", cell: (c) => c.email ?? "-" },
              { header: "Alamat", cell: (c) => <span className="line-clamp-1">{c.address ?? "-"}</span> },
            ]}
          />
        )}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Pelanggan baru">
        <CustomerForm
          loading={save.isPending}
          submitLabel="Daftarkan"
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await save.mutateAsync(body).catch(() => null);
            if (created) {
              setCreating(false);
              router.push(`/customers/${created.id}`);
            }
          }}
        />
      </Modal>
    </>
  );
}
