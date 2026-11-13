"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { intString } from "@/lib/forms";
import type { ServiceOrder } from "@/types/models";
import { useUpdateOrder } from "../hooks";

const schema = z.object({
  complaint: z.string().trim().min(3, "Keluhan wajib diisi"),
  diagnosis: z.string().trim(),
  serviceCost: intString("Biaya jasa"),
});
type Values = z.infer<typeof schema>;

export function OrderInfoForm({ order }: { order: ServiceOrder }) {
  const update = useUpdateOrder(order.id);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { complaint: order.complaint, diagnosis: order.diagnosis ?? "", serviceCost: String(order.serviceCost) },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        update.mutate(
          { complaint: v.complaint, diagnosis: v.diagnosis || undefined, serviceCost: Number(v.serviceCost) },
          { onSuccess: () => reset(v) },
        ),
      )}
      className="space-y-4"
    >
      <Field label="Keluhan pelanggan" error={errors.complaint?.message}>
        <Textarea {...register("complaint")} />
      </Field>
      <Field label="Diagnosis mekanik" error={errors.diagnosis?.message}>
        <Textarea placeholder="Hasil pemeriksaan dan tindakan" {...register("diagnosis")} />
      </Field>
      <Field label="Biaya jasa (Rp)" error={errors.serviceCost?.message} hint="Total dihitung ulang oleh server setiap biaya berubah.">
        <Input inputMode="numeric" className="max-w-xs" {...register("serviceCost")} />
      </Field>
      <Button type="submit" disabled={!isDirty} loading={update.isPending}>Simpan perubahan</Button>
    </form>
  );
}
