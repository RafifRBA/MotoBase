"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ErrorState, FullPageSpinner, PageHeader } from "@/components/ui/states";
import { normalizePhoneInput, phoneSchema } from "@/lib/forms";
import { formatPhone } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { Customer } from "@/types/models";
import { customerPortalApi } from "./api";

const schema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: phoneSchema,
  address: z.string().trim().max(500, "Alamat maksimal 500 karakter"),
});
type Values = z.infer<typeof schema>;

function ProfileForm({ profile }: { profile: Customer }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: customerPortalApi.updateProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-portal"] });
      notifySuccess("Profil disimpan");
    },
    onError: notifyError,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: profile.name, phone: formatPhone(profile.phone), address: profile.address ?? "" },
  });

  const submit = handleSubmit((v) =>
    save.mutate(
      { name: v.name, phone: normalizePhoneInput(v.phone), address: v.address },
      { onSuccess: () => reset(v) },
    ),
  );

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      <Field label="Nama lengkap" error={errors.name?.message}>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Surel" hint="Surel adalah identitas login dan tidak bisa diubah di sini.">
        <Input value={profile.email ?? ""} disabled readOnly />
      </Field>
      <Field label="Nomor telepon" error={errors.phone?.message} hint="Format 0812xxxxxxxx.">
        <Input type="tel" autoComplete="tel" {...register("phone")} />
      </Field>
      <Field label="Alamat" error={errors.address?.message} hint="Opsional. Membantu bengkel menghubungi atau mengantar kendaraan.">
        <Textarea rows={3} {...register("address")} />
      </Field>
      <Button type="submit" disabled={!isDirty} loading={save.isPending}>Simpan perubahan</Button>
    </form>
  );
}

export function CustomerProfile() {
  const q = useQuery({ queryKey: ["customer-portal", "profile"], queryFn: customerPortalApi.profile });
  if (q.isLoading) return <FullPageSpinner />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <PageHeader title="Profil saya" description="Lengkapi data Anda agar bengkel mudah menghubungi Anda." />
      <Card className="max-w-xl">
        <CardHeader title="Data pribadi" />
        <CardBody>
          {/* key: form dibuat ulang bila data dari server berubah */}
          <ProfileForm key={`${q.data.name}|${q.data.phone}|${q.data.address}`} profile={q.data} />
        </CardBody>
      </Card>
    </>
  );
}
