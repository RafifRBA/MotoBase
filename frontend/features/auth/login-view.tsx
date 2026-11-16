"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { FullPageSpinner } from "@/components/ui/states";
import { describeError } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { ROLE_HOME } from "@/lib/permissions";

const schema = z.object({
  email: z.string().trim().min(1, "Surel wajib diisi").email("Format surel tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});
type Values = z.infer<typeof schema>;

export function LoginView() {
  const router = useRouter();
  const { status, login, user } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(ROLE_HOME[user.role]);
  }, [status, router, user]);

  if (status === "loading" || status === "authenticated") return <FullPageSpinner />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await login(values.email, values.password);
      router.replace(ROLE_HOME[me.role]);
    } catch (e) {
      setFormError(describeError(e));
    }
  });

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden flex-col justify-between bg-asphalt-900 p-12 text-slate-200 lg:flex">
        <div className="self-start rounded-xl bg-white px-5 py-3">
          <Logo className="h-9" />
        </div>
        <div>
          <p className="text-6xl font-bold leading-none text-brand-500">#012</p>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight text-white">
            Setiap motor punya nomor antrean, status, dan riwayat.
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Catat servis, pantau pemakaian suku cadang, dan biarkan pelanggan melihat progres motornya sendiri.
          </p>
        </div>
        <p className="text-sm text-slate-500">Sistem digitalisasi alur servis dan stok suku cadang</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Masuk ke MotoBase</h2>
            <p className="mt-1 text-sm text-slate-600">Gunakan akun yang diberikan pemilik bengkel.</p>
          </div>
          {formError && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          )}
          <Field label="Surel" error={errors.email?.message}>
            <Input type="email" autoComplete="username" autoFocus {...register("email")} />
          </Field>
          <Field label="Kata sandi" error={errors.password?.message}>
            <Input type="password" autoComplete="current-password" {...register("password")} />
          </Field>
          <Button type="submit" loading={isSubmitting} className="w-full">
            Masuk
          </Button>
          <p className="text-center text-sm text-slate-600">Belum punya akun? <a href="/register" className="font-medium text-brand-700 hover:underline">Daftar sebagai pelanggan</a></p>
        </form>
      </section>
    </main>
  );
}
