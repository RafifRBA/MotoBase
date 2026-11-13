"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, PageHeader } from "@/components/ui/states";
import { useAllMovements } from "./hooks";
import { MovementTable } from "./movement-table";

export function MovementList() {
  const [page, setPage] = useState(1);
  const q = useAllMovements({ page, limit: 20 });
  return (
    <>
      <PageHeader title="Riwayat stok" description="Seluruh pergerakan stok: masuk, pemakaian, penyesuaian, dan pembatalan." />
      <Card>
        {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : <MovementTable rows={q.data?.items ?? []} loading={q.isLoading} />}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
