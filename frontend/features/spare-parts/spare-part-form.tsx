"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { blankToUndefined, intString, optionalIntString } from "@/lib/forms";
import type { SparePart } from "@/types/models";
import type { SparePartInput } from "./api";

const schema = z.object({
  sku: z.string().trim().min(2, "SKU wajib diisi"),
  name: z.string().trim().min(2, "Nama wajib diisi"),
  category: z.string().trim().min(2, "Kategori wajib diisi"),
  unit: z.string().trim().min(1, "Satuan wajib diisi"),
  sellingPrice: intString("Harga jual"),
  purchasePrice: optionalIntString("Harga modal"),
  initialStock: optionalIntString("Stok awal"),
  minimumStock: intString("Batas minimum"),
});
type Values = z.infer<typeof schema>;

interface Props {
  existing?: SparePart;
  loading?: boolean;
  onSubmit: (values: SparePartInput) => void | Promise<void>;
  onCancel?: () => void;
}

export function SparePartForm({ existing, loading, onSubmit, onCancel }: Props) {
  const editing = !!existing;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: existing?.sku ?? "",
      name: existing?.name ?? "",
      category: existing?.category ?? "",
      unit: existing?.unit ?? "pcs",
      sellingPrice: existing ? String(existing.sellingPrice) : "",
      purchasePrice: existing?.purchasePrice != null ? String(existing.purchasePrice) : "",
      initialStock: "0",
      minimumStock: existing ? String(existing.minimumStock) : "3",
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        onSubmit({
          sku: v.sku,
          name: v.name,
          category: v.category,
          unit: v.unit,
          sellingPrice: Number(v.sellingPrice),
          purchasePrice: blankToUndefined(v.purchasePrice) ? Number(v.purchasePrice) : undefined,
          initialStock: editing ? undefined : Number(v.initialStock || 0),
          minimumStock: Number(v.minimumStock),
        }),
      )}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="SKU" error={errors.sku?.message}>
          <Input disabled={editing} {...register("sku")} />
        </Field>
        <Field label="Kategori" error={errors.category?.message}>
          <Input placeholder="Mesin" {...register("category")} />
        </Field>
      </div>
      <Field label="Nama suku cadang" error={errors.name?.message}>
        <Input {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Harga jual (Rp)" error={errors.sellingPrice?.message}>
          <Input inputMode="numeric" {...register("sellingPrice")} />
        </Field>
        <Field label="Harga modal (Rp)" error={errors.purchasePrice?.message} hint={editing ? "Kosongkan jika tidak diubah." : undefined}>
          <Input inputMode="numeric" {...register("purchasePrice")} />
        </Field>
        {!editing && (
          <Field label="Stok awal" error={errors.initialStock?.message}>
            <Input inputMode="numeric" {...register("initialStock")} />
          </Field>
        )}
        <Field label="Batas minimum" error={errors.minimumStock?.message}>
          <Input inputMode="numeric" {...register("minimumStock")} />
        </Field>
        <Field label="Satuan" error={errors.unit?.message}>
          <Input {...register("unit")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="secondary" onClick={onCancel}>Batal</Button>}
        <Button type="submit" loading={loading}>{editing ? "Simpan perubahan" : "Daftarkan"}</Button>
      </div>
    </form>
  );
}
