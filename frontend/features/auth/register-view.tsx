"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { describeError, publicApi } from "@/lib/api";
import type { ApiSuccess } from "@/types/api";
import type { User } from "@/types/models";
import { useAuth } from "./auth-provider";

const schema = z.object({ name: z.string().trim().min(2, "Nama minimal 2 karakter"), email: z.string().trim().email("Format surel tidak valid"), phone: z.string().trim().min(8, "Nomor telepon wajib diisi"), password: z.string().min(8, "Kata sandi minimal 8 karakter"), confirm: z.string() }).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Konfirmasi kata sandi tidak sama" });
type Values = z.infer<typeof schema>;
export function RegisterView() {
  const router = useRouter(); const { status, login } = useAuth(); const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = handleSubmit(async ({ confirm: _confirm, ...body }) => {
    setError("");
    try { await publicApi.post<ApiSuccess<{ accessToken: string; user: User }>>("/auth/register-customer", body); await login(body.email, body.password); router.replace("/my-dashboard"); }
    catch (e) { setError(describeError(e)); }
  });
  if (status === "authenticated") router.replace("/my-dashboard");
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-5"><form onSubmit={submit} noValidate className="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-2 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-brand-600 text-white"><Wrench className="size-5" /></span><span className="text-lg font-semibold">MotoBase</span></div><div><h1 className="text-2xl font-semibold">Daftar pelanggan</h1><p className="mt-1 text-sm text-slate-600">Buat akun untuk mendaftarkan kendaraan dan memantau servis.</p></div>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Field label="Nama lengkap" error={errors.name?.message}><Input autoComplete="name" {...register("name")} /></Field><Field label="Surel" error={errors.email?.message}><Input type="email" autoComplete="email" {...register("email")} /></Field><Field label="Nomor telepon" error={errors.phone?.message}><Input type="tel" autoComplete="tel" {...register("phone")} /></Field><Field label="Kata sandi" error={errors.password?.message}><Input type="password" autoComplete="new-password" {...register("password")} /></Field><Field label="Ulangi kata sandi" error={errors.confirm?.message}><Input type="password" autoComplete="new-password" {...register("confirm")} /></Field><Button loading={isSubmitting} className="w-full">Buat akun</Button><p className="text-center text-sm text-slate-600">Sudah punya akun? <Link className="font-medium text-brand-700 hover:underline" href="/login">Masuk</Link></p></form></main>;
}
