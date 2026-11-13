"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/states";
import { useCustomerVehicles } from "@/features/customers/hooks";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/models";
import { useSaveVehicle } from "./hooks";
import { VehicleForm } from "./vehicle-form";

interface Props {
  customer: Customer;
  value: string;
  onChange: (vehicleId: string) => void;
}

export function VehiclePicker({ customer, value, onChange }: Props) {
  const [creating, setCreating] = useState(false);
  const list = useCustomerVehicles(customer.id);
  const save = useSaveVehicle();
  const items = list.data?.items ?? [];

  return (
    <div className="space-y-2">
      {list.isLoading ? (
        <Spinner className="size-5" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
          {customer.name} belum punya kendaraan terdaftar.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {items.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onChange(v.id)}
              aria-pressed={value === v.id}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                value === v.id ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white hover:bg-slate-50",
              )}
            >
              <p className="text-sm font-semibold text-slate-900">{v.licensePlate}</p>
              <p className="text-xs text-slate-500">{v.brand} {v.model}</p>
            </button>
          ))}
        </div>
      )}
      <Button size="sm" variant="secondary" onClick={() => setCreating(true)}>
        <Plus className="size-3.5" aria-hidden /> Kendaraan baru
      </Button>

      <Modal open={creating} onClose={() => setCreating(false)} title="Kendaraan baru">
        <VehicleForm
          fixedCustomer={customer}
          loading={save.isPending}
          submitLabel="Daftarkan"
          onCancel={() => setCreating(false)}
          onSubmit={async (body) => {
            const created = await save.mutateAsync(body).catch(() => null);
            if (created) {
              setCreating(false);
              onChange(created.id);
            }
          }}
        />
      </Modal>
    </div>
  );
}
