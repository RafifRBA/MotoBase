import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageMeta } from "@/types/api";
import { Button } from "./button";

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (page: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <span>
        Halaman {meta.page} dari {meta.totalPages} · {meta.total} data
      </span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft className="size-4" />
        </Button>
        <Button size="sm" variant="secondary" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Halaman berikutnya">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
