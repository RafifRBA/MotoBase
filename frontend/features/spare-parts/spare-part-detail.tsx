"use client";

import { useState } from "react";
import { ArrowDownToLine, ClipboardCheck, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, FullPageSpinner, PageHeader } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { useAuth } from "@/features/auth/auth-provider";
import { formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { useAdjustStock, useSaveSparePart, useSparePart, useSparePartMovements, useStockIn } from "./hooks";
import { MovementTable } from "./movement-table";
import { SparePartForm } from "./spare-part-form";
import { AdjustStockForm, StockInForm } from "./stock-forms";
import { StockBadge } from "./stock-badge";

type Dialog = "edit" | "in" | "adjust" | null;

export function SparePartDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const canWrite = useCan(ACCESS.stockWrite);
  const canSeeMovements = useCan(ACCESS.stockRead);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [page, setPage] = useState(1);
  const part = useSparePart(id);
  const movements = useSparePartMovements(id, { page, limit: 10 }, canSeeMovements);
  const save = useSaveSparePart(id);
  const stockIn = useStockIn(id);
  const adjust = useAdjustStock(id);
  const close = () => setDialog(null);

  if (part.isLoading) return <FullPageSpinner />;
  if (part.isError || !part.data) return <ErrorState error={part.error} onRetry={() => part.refetch()} />;
  const p = part.data;

  return (
    <>
      <PageHeader
        title={p.name}
        description={`SKU ${p.sku} · ${p.category}`}
        actions={
          <>
            <LinkButton href="/spare-parts" variant="secondary">Kembali</LinkButton>
            {canWrite && (
              <>
                <Button variant="secondary" onClick={() => setDialog("edit")}><Pencil className="size-4" aria-hidden /> Ubah</Button>
                <Button variant="secondary" onClick={() => setDialog("adjust")}><ClipboardCheck className="size-4" aria-hidden /> Opname</Button>
                <Button onClick={() => setDialog("in")}><ArrowDownToLine className="size-4" aria-hidden /> Stok masuk</Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Ringkasan" action={!p.isActive && <Badge tone="red">Nonaktif</Badge>} />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Stok saat ini", value: <StockBadge part={p} /> },
                { label: "Batas minimum", value: `${p.minimumStock} ${p.unit}` },
                { label: "Harga jual", value: formatRupiah(p.sellingPrice) },
                ...(user?.role === "OWNER" ? [{ label: "Harga modal", value: formatRupiah(p.purchasePrice) }] : []),
              ]}
            />
          </CardBody>
        </Card>

        {canSeeMovements && (
          <Card>
            <CardHeader title="Riwayat pergerakan" description="Setiap perubahan stok tercatat dan tidak dihapus" />
            <MovementTable rows={movements.data?.items ?? []} loading={movements.isLoading} showPart={false} />
            <Pagination meta={movements.data?.meta} onPage={setPage} />
          </Card>
        )}
      </div>

      <Modal open={dialog === "edit"} onClose={close} title="Ubah suku cadang" size="lg">
        <SparePartForm
          existing={p}
          loading={save.isPending}
          onCancel={close}
          onSubmit={async (b) => {
            if (await save.mutateAsync(b).then(() => true, () => false)) close();
          }}
        />
      </Modal>
      <Modal open={dialog === "in"} onClose={close} title="Catat stok masuk">
        <StockInForm
          loading={stockIn.isPending}
          onCancel={close}
          onSubmit={async (b) => {
            if (await stockIn.mutateAsync(b).then(() => true, () => false)) close();
          }}
        />
      </Modal>
      <Modal open={dialog === "adjust"} onClose={close} title="Penyesuaian stok (opname)">
        <AdjustStockForm
          current={p.currentStock}
          loading={adjust.isPending}
          onCancel={close}
          onSubmit={async (b) => {
            if (await adjust.mutateAsync(b).then(() => true, () => false)) close();
          }}
        />
      </Modal>
    </>
  );
}
