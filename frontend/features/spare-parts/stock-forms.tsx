"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { blankToUndefined } from "@/lib/forms";

const inSchema = z.object({
  quantity: z.string().regex(/^[1-9]\d*$/, "Jumlah minimal 1"),
  note: z.string().trim(),
});
const adjustSchema = z.object({
  newStock: z.string().regex(/^\d+$/, "Isi dengan stok hasil hitung fisik (0 atau lebih)"),
  note: z.string().trim().min(3, "Alasan penyesuaian wajib diisi"),
});

export function StockInForm({ loading, onSubmit, onCancel }: { loading?: boolean; onSubmit: (v: { quantity: number; reason?: string }) => void | Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof inSchema>>({ resolver: zodResolver(inSchema), defaultValues: { quantity: "", note: "" } });
  return (
    <form noValidate onSubmit={handleSubmit((v) => onSubmit({ quantity: Number(v.quantity), reason: blankToUndefined(v.note) }))} className="space-y-4">
      <Field label="Jumlah masuk" error={errors.quantity?.message}>
        <Input inputMode="numeric" autoFocus {...register("quantity")} />
      </Field>
      <Field label="Catatan (opsional)" hint="Mis. nama pemasok atau nomor faktur.">
        <Input {...register("note")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={loading}>Catat stok masuk</Button>
      </div>
    </form>
  );
}

export function AdjustStockForm({ current, loading, onSubmit, onCancel }: { current: number; loading?: boolean; onSubmit: (v: { newStock: number; note?: string }) => void | Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof adjustSchema>>({ resolver: zodResolver(adjustSchema), defaultValues: { newStock: String(current), note: "" } });
  return (
    <form noValidate onSubmit={handleSubmit((v) => onSubmit({ newStock: Number(v.newStock), note: v.note }))} className="space-y-4">
      <p className="text-sm text-slate-600">Stok tercatat saat ini: <span className="font-semibold text-slate-900">{current}</span>. Isi dengan jumlah hasil hitung fisik (opname).</p>
      <Field label="Stok sebenarnya" error={errors.newStock?.message}>
        <Input inputMode="numeric" autoFocus {...register("newStock")} />
      </Field>
      <Field label="Alasan" error={errors.note?.message}>
        <Input placeholder="Hasil opname, barang rusak, dll." {...register("note")} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={loading}>Simpan penyesuaian</Button>
      </div>
    </form>
  );
}
