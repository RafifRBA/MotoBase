import { Badge, type Tone } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatDateTime } from "@/lib/format";
import { isPopulated } from "@/lib/refs";
import type { StockMovement } from "@/types/models";

const TYPE: Record<string, { label: string; tone: Tone }> = {
  IN: { label: "Masuk", tone: "green" },
  MASUK: { label: "Masuk", tone: "green" },
  INITIAL: { label: "Stok awal", tone: "green" },
  USAGE: { label: "Pemakaian", tone: "amber" },
  PEMAKAIAN: { label: "Pemakaian", tone: "amber" },
  ADJUSTMENT: { label: "Penyesuaian", tone: "blue" },
  PENYESUAIAN: { label: "Penyesuaian", tone: "blue" },
  REVERSAL: { label: "Pembatalan", tone: "violet" },
  PEMBATALAN: { label: "Pembatalan", tone: "violet" },
};

export function MovementTable({ rows, loading, showPart = true }: { rows: StockMovement[]; loading?: boolean; showPart?: boolean }) {
  return (
    <DataTable
      loading={loading}
      rows={rows}
      rowKey={(m) => m.id}
      emptyTitle="Belum ada pergerakan stok"
      columns={[
        { header: "Waktu", cell: (m) => formatDateTime(m.createdAt) },
        ...(showPart
          ? [{ header: "Suku cadang", cell: (m: StockMovement) => (isPopulated(m.sparePartId) ? `${m.sparePartId.name ?? ""} ${m.sparePartId.sku ? `(${m.sparePartId.sku})` : ""}` : "-") }]
          : []),
        { header: "Jenis", cell: (m) => { const t = TYPE[m.type] ?? { label: m.type, tone: "gray" as Tone }; return <Badge tone={t.tone}>{t.label}</Badge>; } },
        { header: "Jumlah", className: "text-right", cell: (m) => { const d = m.delta ?? m.quantity; return <span className="font-medium">{d > 0 ? `+${d}` : d}</span>; } },
        { header: "Stok akhir", className: "text-right", cell: (m) => m.stockAfter ?? "-" },
        { header: "Oleh", cell: (m) => (isPopulated(m.createdBy) ? m.createdBy.name ?? "-" : "-") },
        { header: "Catatan", cell: (m) => m.note ?? "-" },
      ]}
    />
  );
}
