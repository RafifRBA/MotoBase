"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/states";
import { useDebounce } from "@/lib/hooks";
import { formatPhone } from "@/lib/format";
import type { Customer } from "@/types/models";
import { CustomerForm } from "./customer-form";
import { useCustomers, useSaveCustomer } from "./hooks";

interface Props {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  allowCreate?: boolean;
}

export function CustomerPicker({ value, onChange, allowCreate = true }: Props) {
  const [term, setTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const search = useDebounce(term.trim());
  const list = useCustomers({ search, limit: 6 }, !value);
  const save = useSaveCustomer();

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-slate-900">{value.name}</p>
          <p className="text-xs text-slate-500">{formatPhone(value.phone)}</p>
        </div>
        <Button size="sm" variant="secondary" onClick={() => onChange(null)}>
          Ganti
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <SearchInput className="flex-1" placeholder="Cari nama atau nomor telepon" value={term} onChange={(e) => setTerm(e.target.value)} />
        {allowCreate && (
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Baru
          </Button>
        )}
      </div>
      <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200">
        {list.isLoading ? (
          <div className="flex justify-center py-6"><Spinner className="size-5" /></div>
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">Pelanggan tidak ditemukan. Daftarkan sebagai pelanggan baru.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.data!.items.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onChange(c)} className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50">
                  <span className="text-sm font-medium text-slate-900">{c.name}</span>
                  <span className="text-xs text-slate-500">{formatPhone(c.phone)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Pelanggan baru">
        <CustomerForm
          loading={save.isPending}
          submitLabel="Daftarkan"
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await save.mutateAsync(body).catch(() => null);
            if (created) {
              setCreating(false);
              onChange(created);
            }
          }}
        />
      </Modal>
    </div>
  );
}
