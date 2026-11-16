"use client";

import { PasswordInput } from "@/components/ui/password-input";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { blankToUndefined, normalizePhoneInput } from "@/lib/forms";
import type { User } from "@/types/models";

const base = {
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  email: z.string().trim().min(1, "Surel wajib diisi").email("Format surel tidak valid"),
  phone: z.string().trim(),
};
const createSchema = z.object({
  ...base,
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  role: z.enum(["ADMIN", "MECHANIC"]),
});
const editSchema = z.object(base);

export interface UserFormValues {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role?: "ADMIN" | "MECHANIC";
}

interface Props {
  existing?: User;
  loading?: boolean;
  onSubmit: (v: UserFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export function UserForm({ existing, loading, onSubmit, onCancel }: Props) {
  const editing = !!existing;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(editing ? (editSchema as unknown as typeof createSchema) : createSchema),
    defaultValues: { name: existing?.name ?? "", email: existing?.email ?? "", phone: existing?.phone ?? "", password: "", role: "MECHANIC" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit((v) =>
        onSubmit({
          name: v.name,
          email: v.email,
          phone: blankToUndefined(v.phone) ? normalizePhoneInput(v.phone) : undefined,
          ...(editing ? {} : { password: v.password, role: v.role }),
        }),
      )}
      className="space-y-4"
    >
      <Field label="Nama" error={errors.name?.message}><Input {...register("name")} /></Field>
      <Field label="Surel" error={errors.email?.message}><Input type="email" autoComplete="off" {...register("email")} /></Field>
      <Field label="Nomor telepon (opsional)" error={errors.phone?.message}><Input inputMode="tel" {...register("phone")} /></Field>
      {!editing && (
        <>
          <Field label="Peran" error={errors.role?.message}>
            <Select {...register("role")}>
              <option value="MECHANIC">Mekanik</option>
              <option value="ADMIN">Kasir / Admin</option>
            </Select>
          </Field>
          <Field htmlFor="staff-password" label="Kata sandi awal" error={errors.password?.message} hint="Minimal 8 karakter. Sampaikan ke staf secara langsung.">
            <PasswordInput id="staff-password" autoComplete="new-password" {...register("password")} />
          </Field>
        </>
      )}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button type="submit" loading={loading}>{editing ? "Simpan" : "Buat akun"}</Button>
      </div>
    </form>
  );
}
