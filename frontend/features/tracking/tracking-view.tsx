"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ApiError, publicApi, toApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/states";
import { STATUS_FLOW, STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ApiSuccess } from "@/types/api";
import type { TrackingView as Tracking } from "@/types/models";

async function fetchTracking(token: string) {
  try {
    const res = await publicApi.get<ApiSuccess<Tracking>>(`/public/service-orders/track/${encodeURIComponent(token)}`);
    return res.data.data;
  } catch (e) {
    throw toApiError(e);
  }
}

export function TrackingView({ token }: { token: string }) {
  const q = useQuery({
    queryKey: ["tracking", token],
    queryFn: () => fetchTracking(token),
    refetchInterval: 30_000,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500 && err.status !== 0) && count < 2,
  });

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-asphalt-900 px-4 py-4 text-white">
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <span className="rounded-lg bg-white px-3 py-1.5"><Logo className="h-6" /></span>
          <span className="text-sm text-slate-400">Pantau servis motor Anda</span>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 p-4">
        {q.isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="size-8" /></div>
        ) : q.isError || !q.data ? (
          <div className="rounded-xl bg-white p-8 text-center">
            <p className="font-semibold text-slate-900">
              {q.error instanceof ApiError && q.error.status === 429 ? "Terlalu banyak permintaan" : "Tautan tidak ditemukan"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {q.error instanceof ApiError && q.error.status === 429
                ? "Tunggu sebentar lalu muat ulang halaman ini."
                : "Tautan ini salah, sudah dicabut, atau sudah tidak berlaku. Hubungi bengkel untuk mendapatkan tautan baru."}
            </p>
          </div>
        ) : (
          <TrackingContent t={q.data} />
        )}
      </main>
    </div>
  );
}

function TrackingContent({ t }: { t: Tracking }) {
  const cancelled = t.currentStatus === "DIBATALKAN";
  const currentIndex = STATUS_FLOW.indexOf(t.currentStatus);
  const history = [...t.statusHistory].reverse();
  const parts = t.usedSpareParts ?? [];

  return (
    <>
      <section className="rounded-xl bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Nomor antrean</p>
            <p className="text-5xl font-bold leading-none text-asphalt-900">{String(t.queueNumber).padStart(3, "0")}</p>
          </div>
          <Badge tone={STATUS_TONE[t.currentStatus]} className="px-3 py-1 text-sm">{STATUS_LABEL[t.currentStatus]}</Badge>
        </div>
        <p className="mt-4 text-sm text-slate-600">{t.orderNumber} · masuk {formatDate(t.serviceDate)}</p>

        {cancelled ? (
          <p className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Servis ini dibatalkan. Hubungi bengkel untuk informasi lebih lanjut.</p>
        ) : (
          <ol className="mt-6 flex items-start" aria-label="Tahapan servis">
            {STATUS_FLOW.map((s, i) => {
              const done = i < currentIndex;
              const active = i === currentIndex;
              return (
                <li key={s} className="flex flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
                  <div className="flex w-full items-center">
                    <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done || active ? "bg-brand-600" : "bg-slate-200")} />
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs", done ? "border-brand-600 bg-brand-600 text-white" : active ? "border-brand-600 bg-white text-brand-700" : "border-slate-300 bg-white text-slate-400")}>
                      {done ? <Check className="size-4" aria-hidden /> : i + 1}
                    </span>
                    <span className={cn("h-0.5 flex-1", i === STATUS_FLOW.length - 1 ? "opacity-0" : done ? "bg-brand-600" : "bg-slate-200")} />
                  </div>
                  <span className={cn("mt-2 text-[11px] leading-tight sm:text-xs", active ? "font-semibold text-slate-900" : "text-slate-500")}>{STATUS_LABEL[s]}</span>
                </li>
              );
            })}
          </ol>
        )}
        {t.currentStatus === "SELESAI" && <p className="mt-5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Motor Anda sudah selesai dan siap diambil.</p>}
      </section>

      <section className="rounded-xl bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Detail</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div><dt className="text-xs text-slate-500">Kendaraan</dt><dd>{t.vehicle.brand} {t.vehicle.model}</dd></div>
          <div><dt className="text-xs text-slate-500">Plat nomor</dt><dd className="font-medium">{t.vehicle.licensePlate}</dd></div>
          <div><dt className="text-xs text-slate-500">Atas nama</dt><dd>{t.customerName}</dd></div>
          <div><dt className="text-xs text-slate-500">Mekanik</dt><dd>{t.mechanic?.name ?? "Belum ditugaskan"}</dd></div>
          <div className="col-span-2"><dt className="text-xs text-slate-500">Keluhan</dt><dd>{t.complaint}</dd></div>
        </dl>
      </section>

      {(t.grandTotal != null || parts.length > 0) && (
        <section className="rounded-xl bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-900">Rincian biaya</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {t.serviceCost != null && <div className="flex justify-between"><dt className="text-slate-600">Biaya jasa</dt><dd>{formatRupiah(t.serviceCost)}</dd></div>}
            {parts.map((p, i) => (
              <div key={i} className="flex justify-between"><dt className="text-slate-600">{p.quantity} × {p.name ?? "Suku cadang"}</dt><dd>{formatRupiah(p.subtotal ?? (p.unitPrice != null ? p.unitPrice * p.quantity : undefined))}</dd></div>
            ))}
            {t.grandTotal != null && <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900"><dt>Total</dt><dd>{formatRupiah(t.grandTotal)}</dd></div>}
          </dl>
        </section>
      )}

      <section className="rounded-xl bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Perkembangan</h2>
        <ol className="mt-3 space-y-3">
          {history.map((h, i) => (
            <li key={`${h.timestamp}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className={i === 0 ? "font-semibold text-slate-900" : "text-slate-600"}>{STATUS_LABEL[h.status]}</span>
              <span className="text-xs text-slate-500">{formatDateTime(h.timestamp)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-400">Halaman ini diperbarui otomatis setiap 30 detik.</p>
      </section>
    </>
  );
}
