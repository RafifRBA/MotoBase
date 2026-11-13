"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { blankToUndefined, normalizePhoneInput, phoneSchema } from "@/lib/forms";
import type { Customer } from "@/types/models";
import type { CustomerInput } from "./api";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: phoneSchema,
  email: z.string().trim().email("Format surel tidak valid").or(z.literal("")),
  address: z.string().trim(),
  notes: z.string().trim(),
});
type Values = z.infer<typeof schema>;

interface Props {
  defaultValues?: Partial<Customer>;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (values: CustomerInput) => void | Promise<void>;
  onCancel?: () => void;
}

export function CustomerForm({ defaultValues, loading, submitLabel = "Simpan", onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      phone: defaultValues?.phone ? (defaultValues.phone.startsWith("62") ? `0${defaultValues.phone.slice(2)}` : defaultValues.phone) : "",
      email: defaultValues?.email ?? "",
      address: defaultValues?.address ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        // Form ini bisa tampil di dalam modal pada form lain, jangan biarkan submit merambat.
        e.stopPropagation();
        return handleSubmit((v) =>
          onSubmit({
            name: v.name,
            phone: normalizePhoneInput(v.phone),
            email: blankToUndefined(v.email),
            address: blankToUndefined(v.address),
            notes: blankToUndefined(v.notes),
          }),
        )(e);
      }}
      className="space-y-4"
    >
      <Field label="Nama" error={errors.name?.message}>
        <Input autoComplete="off" {...register("name")} />
      </Field>
      <Field label="Nomor telepon" error={errors.phone?.message} hint="Format 0812xxxxxxxx, disimpan sebagai 62812xxxxxxxx.">
        <Input inputMode="tel" autoComplete="off" {...register("phone")} />
      </Field>
      <Field label="Surel (opsional)" error={errors.email?.message}>
        <Input type="email" autoComplete="off" {...register("email")} />
      </Field>
      <Field label="Alamat (opsional)" error={errors.address?.message}>
        <Textarea rows={2} {...register("address")} />
      </Field>
      <Field label="Catatan (opsional)" error={errors.notes?.message}>
        <Textarea rows={2} {...register("notes")} />
      </Field>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" loading={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
