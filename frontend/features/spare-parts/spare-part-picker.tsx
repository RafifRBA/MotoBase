"use client";

import { useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/states";
import { useDebounce } from "@/lib/hooks";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SparePart } from "@/types/models";
import { useSpareParts } from "./hooks";

interface Props {
  value: SparePart | null;
  onChange: (part: SparePart | null) => void;
}

/** Pilih suku cadang dengan pencarian. Barang berstok 0 tidak bisa dipilih. */
export function SparePartPicker({ value, onChange }: Props) {
  const [term, setTerm] = useState("");
  const search = useDebounce(term.trim());
  const list = useSpareParts({ search, limit: 8, isActive: "true" });

  return (
    <div className="space-y-2">
      <SearchInput placeholder="Cari suku cadang" value={term} onChange={(e) => setTerm(e.target.value)} />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
        {list.isLoading ? (
          <div className="flex justify-center py-5"><Spinner className="size-5" /></div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <p className="px-3 py-3 text-sm text-slate-500">Suku cadang tidak ditemukan.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.data!.items.map((p) => {
              const empty = p.currentStock <= 0;
              const selected = value?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={empty}
                    aria-pressed={selected}
                    onClick={() => onChange(selected ? null : p)}
                    className={cn("flex w-full items-center justify-between gap-3 px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50", selected ? "bg-brand-50" : "hover:bg-slate-50")}
                  >
                    <span>
                      <span className="block text-sm font-medium text-slate-900">{p.name}</span>
                      <span className="block text-xs text-slate-500">{p.sku} · {formatRupiah(p.sellingPrice)}</span>
                    </span>
                    <span className={cn("text-xs font-medium", empty ? "text-red-600" : p.isLowStock ? "text-amber-700" : "text-slate-600")}>
                      {empty ? "Habis" : `Stok ${p.currentStock} ${p.unit}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
