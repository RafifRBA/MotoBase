import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { isPopulated } from "@/lib/refs";
import type { StatusHistoryEntry } from "@/types/models";

export function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  const items = [...history].reverse();
  if (items.length === 0) return <p className="text-sm text-slate-500">Belum ada riwayat status.</p>;
  return (
    <ol className="space-y-4">
      {items.map((h, i) => (
        <li key={`${h.changedAt}-${i}`} className="relative pl-6">
          <span className={`absolute left-0 top-1.5 size-2.5 rounded-full ${i === 0 ? "bg-brand-600" : "bg-slate-300"}`} aria-hidden />
          {i < items.length - 1 && <span className="absolute left-[4.5px] top-4 h-[calc(100%+0.5rem)] w-px bg-slate-200" aria-hidden />}
          <p className="text-sm font-medium text-slate-900">
            {STATUS_LABEL[h.to]} {h.isCorrection && <Badge tone="orange" className="ml-1">Koreksi</Badge>}
          </p>
          <p className="text-xs text-slate-500">
            {formatDateTime(h.changedAt)}
            {isPopulated(h.changedBy) && h.changedBy.name ? ` · ${h.changedBy.name}` : ""}
          </p>
          {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
