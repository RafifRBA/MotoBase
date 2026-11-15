"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bike, ClipboardList, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ErrorState, PageHeader, Spinner } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/features/service-orders/components/status-badge";
import { UNPAID } from "@/lib/constants";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/notify";
import { isPopulated } from "@/lib/refs";
import { customerPortalApi, serviceRequestsApi, type ServiceRequest } from "./api";

function usePortalData() {
  const profile = useQuery({ queryKey: ["customer-portal", "profile"], queryFn: customerPortalApi.profile });
  const vehicles = useQuery({ queryKey: ["customer-portal", "vehicles"], queryFn: customerPortalApi.vehicles });
  const orders = useQuery({ queryKey: ["customer-portal", "orders"], queryFn: customerPortalApi.orders });
  const requests = useQuery({ queryKey: ["customer-portal", "requests"], queryFn: customerPortalApi.requests });
  return { profile, vehicles, orders, requests };
}

export function CustomerDashboard() {
  const { profile, vehicles, orders } = usePortalData();
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;
  const rows = orders.data?.items ?? [];
  return <>
    <PageHeader title={`Halo, ${profile.data?.name.split(" ")[0] ?? ""}`} description="Pantau kendaraan dan perkembangan servis Anda." />
    <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Kendaraan" value={vehicles.data?.meta.total ?? "…"} /><StatCard label="Total servis" value={orders.data?.meta.total ?? "…"} /><StatCard label="Sedang berjalan" value={rows.filter((o) => !["DIAMBIL", "DIBATALKAN"].includes(o.currentStatus)).length} /></div>
    <Card><CardHeader title="Servis terbaru" description="Status dan rincian estimasi terbaru." />{orders.isLoading ? <div className="p-8 text-center"><Spinner /></div> : rows.length ? <div className="divide-y divide-slate-100">{rows.slice(0, 5).map((o) => <a key={o.id} href="/my-services" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><span><strong className="block text-sm">{o.orderNumber}</strong><span className="text-xs text-slate-500">{o.complaint} · {formatDateTime(o.serviceDate)}</span></span><span className="flex items-center gap-3"><StatusBadge status={o.currentStatus} /></span></a>)}</div> : <p className="p-5 text-sm text-slate-500">Belum ada riwayat servis.</p>}</Card>
  </>;
}

export function CustomerVehicles() {
  const { vehicles } = usePortalData(); const qc = useQueryClient(); const [open, setOpen] = useState(false); const [error, setError] = useState("");
  const add = useMutation({ mutationFn: customerPortalApi.addVehicle, onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-portal"] }); setOpen(false); notifySuccess("Kendaraan ditambahkan"); }, onError: notifyError });
  return <>
    <PageHeader title="Kendaraan saya" description="Daftarkan kendaraan yang Anda miliki untuk mengajukan servis." actions={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> Tambah kendaraan</Button>} />
    {vehicles.isError ? <ErrorState error={vehicles.error} onRetry={() => vehicles.refetch()} /> : <div className="grid gap-4 md:grid-cols-2">{vehicles.isLoading ? <Spinner /> : vehicles.data?.items.map((v) => <Card key={v.id}><CardBody className="flex items-start gap-4 p-5"><span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-700"><Bike /></span><div><h2 className="font-semibold">{v.brand} {v.model}</h2><p className="mt-1 text-sm text-slate-600">{v.licensePlate}</p><p className="text-xs text-slate-500">{[v.year, v.color].filter(Boolean).join(" · ") || "Detail kendaraan"}</p></div></CardBody></Card>)}{!vehicles.isLoading && vehicles.data?.items.length === 0 && <p className="text-sm text-slate-500">Belum ada kendaraan.</p>}</div>}
    <Modal open={open} onClose={() => setOpen(false)} title="Tambah kendaraan"><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); setError(""); add.mutate({ licensePlate: String(d.get("plate")), brand: String(d.get("brand")), model: String(d.get("model")), year: d.get("year") ? Number(d.get("year")) : undefined, color: String(d.get("color") || "") }); }}><Field label="Plat nomor"><Input name="plate" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Merek"><Input name="brand" required /></Field><Field label="Model"><Input name="model" required /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Tahun"><Input name="year" type="number" min="1950" max={new Date().getFullYear() + 1} /></Field><Field label="Warna"><Input name="color" /></Field></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" loading={add.isPending}>Simpan</Button></div></form></Modal>
  </>;
}

/** Pengajuan yang belum menjadi servis: menunggu verifikasi atau ditolak. */
function PendingRequests({ items }: { items: ServiceRequest[] }) {
  const rows = items.filter((r) => r.requestStatus !== "DITERIMA");
  if (rows.length === 0) return null;
  return (
    <Card className="mb-6">
      <CardHeader title="Pengajuan" description="Pengajuan yang diterima admin akan muncul di Riwayat servis." />
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-medium">{isPopulated(r.vehicleId) ? `${r.vehicleId.licensePlate ?? ""} ${r.vehicleId.brand ?? ""} ${r.vehicleId.model ?? ""}` : "Kendaraan"}</p>
              <p className="mt-1 text-sm text-slate-600">{r.complaint}</p>
              <p className="text-xs text-slate-500">Tanggal diminta {formatDate(r.serviceDate)}</p>
              {r.reviewNote && <p className="mt-1 text-xs text-slate-600">Catatan admin: {r.reviewNote}</p>}
            </div>
            <Badge tone={r.requestStatus === "DITOLAK" ? "red" : "amber"}>{r.requestStatus === "DITOLAK" ? "Ditolak" : "Menunggu verifikasi"}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CustomerServices() {
  const { vehicles, orders, requests } = usePortalData(); const qc = useQueryClient(); const [open, setOpen] = useState(false);
  const request = useMutation({ mutationFn: customerPortalApi.requestService, onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer-portal"] }); setOpen(false); notifySuccess("Pengajuan terkirim dan menunggu pemeriksaan admin"); }, onError: notifyError });
  return <>
    <PageHeader title="Servis saya" description="Ajukan servis dan pantau status pengerjaan." actions={<Button onClick={() => setOpen(true)} disabled={!vehicles.data?.items.length}><Plus className="size-4" /> Ajukan servis</Button>} />
    <PendingRequests items={requests.data?.items ?? []} /><Card><CardHeader title="Riwayat servis" description="Servis yang sedang dan telah dikerjakan bengkel." />{orders.isError ? <ErrorState error={orders.error} onRetry={() => orders.refetch()} /> : orders.isLoading ? <div className="p-8 text-center"><Spinner /></div> : orders.data?.items.length ? <div className="divide-y divide-slate-100">{orders.data.items.map((o) => <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium">{o.orderNumber} · {o.vehicleId && typeof o.vehicleId !== "string" ? `${o.vehicleId.brand ?? ""} ${o.vehicleId.model ?? ""}` : "Kendaraan"}</p><p className="mt-1 text-sm text-slate-600">{o.complaint}</p><p className="text-xs text-slate-500">{formatDateTime(o.serviceDate)}</p><p className="mt-1 text-sm font-medium">Estimasi {formatRupiah(o.grandTotal)}</p></div><div className="text-right"><StatusBadge status={o.currentStatus} /><p className="mt-1 text-xs text-slate-500">{o.paymentStatus === UNPAID ? "Belum dibayar" : "Sudah dibayar"}</p></div></div>)}</div> : <p className="p-5 text-sm text-slate-500">Belum ada riwayat servis.</p>}</Card>
    <Modal open={open} onClose={() => setOpen(false)} title="Ajukan servis"><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); request.mutate({ vehicleId: String(d.get("vehicleId")), complaint: String(d.get("complaint")), serviceDate: new Date(String(d.get("serviceDate"))).toISOString() }); }}><Field label="Kendaraan"><Select name="vehicleId" required defaultValue=""><option value="" disabled>Pilih kendaraan</option>{vehicles.data?.items.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} · {v.brand} {v.model}</option>)}</Select></Field><Field label="Tanggal pengajuan"><Input name="serviceDate" type="date" min={new Date().toISOString().slice(0, 10)} required /></Field><Field label="Keluhan"><Textarea name="complaint" minLength={3} required rows={4} placeholder="Jelaskan masalah kendaraan" /></Field><p className="text-xs text-slate-500">Jadwal bersifat permintaan. Admin akan menghubungi Anda untuk konfirmasi.</p><div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button><Button type="submit" loading={request.isPending}><ClipboardList className="size-4" /> Kirim pengajuan</Button></div></form></Modal>
  </>;
}

export function ServiceRequestInbox() {
  const q = useQuery({ queryKey: ["service-requests"], queryFn: serviceRequestsApi.list });
  const qc = useQueryClient(); const [cost, setCost] = useState<Record<string, string>>({});
  const review = useMutation({ mutationFn: ({ id, decision }: { id: string; decision: "DITERIMA" | "DITOLAK" }) => serviceRequestsApi.review(id, { decision, serviceCost: Number(cost[id]) || 0 }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["service-requests"] }); qc.invalidateQueries({ queryKey: ["orders"] }); notifySuccess("Permintaan ditinjau"); }, onError: notifyError });
  return <Card><CardHeader title="Pengajuan pelanggan" description="Verifikasi sebelum permintaan masuk ke antrean servis." />{q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} /> : q.isLoading ? <div className="p-6"><Spinner /></div> : q.data?.items.length ? <div className="divide-y divide-slate-100">{q.data.items.map((o) => <div key={o.id} className="flex flex-wrap items-end justify-between gap-4 p-4"><div className="min-w-56 flex-1"><p className="font-semibold">{typeof o.customerId === "string" ? o.customerId : o.customerId.name} · {typeof o.vehicleId === "string" ? "" : `${o.vehicleId.licensePlate} ${o.vehicleId.brand ?? ""} ${o.vehicleId.model ?? ""}`}</p><p className="text-sm text-slate-600">{o.complaint}</p><p className="text-xs text-slate-500">{formatDateTime(o.serviceDate)}</p></div><Field label="Estimasi biaya jasa"><Input type="number" min="0" value={cost[o.id] ?? "0"} onChange={(e) => setCost((v) => ({ ...v, [o.id]: e.target.value }))} /></Field><div className="flex gap-2"><Button variant="secondary" loading={review.isPending} onClick={() => review.mutate({ id: o.id, decision: "DITOLAK" })}>Tolak</Button><Button loading={review.isPending} onClick={() => review.mutate({ id: o.id, decision: "DITERIMA" })}>Terima</Button></div></div>)}</div> : <p className="p-5 text-sm text-slate-500">Tidak ada permintaan yang menunggu.</p>}</Card>;
}
