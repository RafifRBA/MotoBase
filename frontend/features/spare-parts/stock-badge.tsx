import { Badge } from "@/components/ui/badge";
import type { SparePart } from "@/types/models";

export function StockBadge({ part }: { part: Pick<SparePart, "currentStock" | "isLowStock" | "unit"> }) {
  const tone = part.currentStock <= 0 ? "red" : part.isLowStock ? "amber" : "green";
  const label = part.currentStock <= 0 ? "Habis" : part.isLowStock ? "Menipis" : "Aman";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-semibold text-slate-900">{part.currentStock} {part.unit}</span>
      <Badge tone={tone}>{label}</Badge>
    </span>
  );
}
