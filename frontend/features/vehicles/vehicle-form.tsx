"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { CustomerPicker } from "@/features/customers/customer-picker";
import { blankToUndefined, optionalIntString } from "@/lib/forms";
import { refId } from "@/lib/refs";
import type { Customer, Vehicle } from "@/types/models";
import type { VehicleInput } from "./api";

const schema = z.object({
  licensePlate: z.string().trim().min(3, "Plat nomor wajib diisi"),
  brand: z.string().trim().min(2, "Merek wajib diisi"),
  model: z.string().trim().min(1, "Model wajib diisi"),
  year: optionalIntString("Tahun"),
  color: z.string().trim(),
});
type Values = z.infer<typeof schema>;

interface Props {
  /** Pemilik dikunci (mis. saat menambah dari halaman pelanggan). */
  fixedCustomer?: Customer;
  /** Saat mengubah kendaraan: pemilik saat ini (id atau objek). */
  defaultValues?: Vehicle;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (values: VehicleInput) => void | Promise<void>;
  onCancel?: () => void;
}

export function VehicleForm({ fixedCustomer, defaultValues, loading, submitLabel = "Simpan", onSubmit, onCancel }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(fixedCustomer ?? null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      licensePlate: defaultValues?.licensePlate ?? "",
      brand: defaultValues?.brand ?? "",
      model: defaultValues?.model ?? "",
      year: defaultValues?.year ? String(defaultValues.year) : "",
      color: defaultValues?.color ?? "",
    },
  });

  // Saat mengubah, pemilik lama dipakai kecuali pengguna memilih pelanggan lain (perpindahan pemilik).
  const existingOwnerId = defaultValues ? refId(defaultValues.customerId) : "";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.stopPropagation();
        return handleSubmit((v) => {
          const customerId = customer?.id ?? existingOwnerId;
          if (!customerId) {
            setCustomerError("Pilih pemilik kendaraan");
            return;
          }
          setCustomerError(null);
          return onSubmit({
            customerId,
            licensePlate: v.licensePlate,
            brand: v.brand,
            model: v.model,
            year: v.year ? Number(v.year) : undefined,
            color: blankToUndefined(v.color),
          });
        })(e);
      }}
      className="space-y-4"
    >
      {!fixedCustomer && (
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Pemilik</span>
          {defaultValues && !customer && (
            <p className="text-xs text-slate-500">Pemilik saat ini tetap dipakai. Pilih pelanggan lain untuk memindahkan kepemilikan.</p>
          )}
          <CustomerPicker value={customer} onChange={setCustomer} />
          {customerError && <p className="text-xs text-red-600">{customerError}</p>}
        </div>
      )}
      {fixedCustomer && <p className="text-sm text-slate-600">Pemilik: <span className="font-medium text-slate-900">{fixedCustomer.name}</span></p>}

      <Field label="Plat nomor" error={errors.licensePlate?.message} hint="Contoh: AB 1234 XY. Spasi dan huruf besar dirapikan otomatis oleh sistem.">
        <Input autoComplete="off" {...register("licensePlate")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Merek" error={errors.brand?.message}>
          <Input placeholder="Honda" {...register("brand")} />
        </Field>
        <Field label="Model" error={errors.model?.message}>
          <Input placeholder="Vario 125" {...register("model")} />
        </Field>
        <Field label="Tahun (opsional)" error={errors.year?.message}>
          <Input inputMode="numeric" {...register("year")} />
        </Field>
        <Field label="Warna (opsional)" error={errors.color?.message}>
          <Input {...register("color")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Batal</Button>}
        <Button type="submit" loading={loading}>{submitLabel}</Button>
      </div>
    </form>
  );
}
