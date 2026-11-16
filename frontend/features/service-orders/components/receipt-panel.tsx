"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useCan } from "@/components/role-gate";
import { ACCESS } from "@/lib/permissions";
import { formatDateTime } from "@/lib/format";
import type { ServiceOrder } from "@/types/models";
import { useResendReceipt } from "../hooks";

export function ReceiptPanel({ order }: { order: ServiceOrder }) {
  const canSend = useCan(ACCESS.orderPay);
  const resend = useResendReceipt(order.id);
  const qc = useQueryClient();
  const delivery = order.receiptEmail;
  const queued = delivery?.status === "pending" || delivery?.status === "processing";
  const retrying = delivery?.status === "failed" && delivery.attempts < 5;
  useEffect(() => {
    if (!queued && !retrying) return;
    const timer = setInterval(() => { void qc.invalidateQueries({ queryKey: ["orders", "detail", order.id] }); }, 10000);
    return () => clearInterval(timer);
  }, [queued, retrying, qc, order.id]);
  if (!delivery || !["SELESAI", "DIAMBIL"].includes(order.currentStatus)) return null;
  const label = queued ? "Nota sedang dalam antrean pengiriman."
    : delivery.status === "sent" ? `Nota berhasil dikirim pada ${formatDateTime(delivery.sentAt)}.`
    : delivery.status === "failed" ? (retrying ? "Pengiriman gagal. Sistem akan mencoba ulang otomatis." : "Pengiriman gagal setelah beberapa percobaan. Silakan kirim ulang.")
    : delivery.reason === "missing_email" ? "Nota belum dikirim. Tambahkan surel pada data pelanggan, lalu kirim ulang."
    : delivery.reason === "email_disabled" ? "Pengiriman surel belum diaktifkan oleh pengelola bengkel."
    : delivery.reason === "demo_mode" ? "Mode demo tidak mengirim surel. Pengiriman nota tersedia melalui backend asli."
    : "Nota belum dikirim.";
  return <Card>
    <CardHeader title="Nota servis via surel" />
    <CardBody className="space-y-3">
      <p role="status" className="text-sm text-slate-600">{label}</p>
      {canSend && <Button variant="secondary" disabled={queued || delivery.reason === "demo_mode"} loading={resend.isPending} onClick={() => resend.mutate()}>
        <Mail className="size-4" aria-hidden />{delivery.status === "sent" ? "Kirim ulang nota" : "Kirim nota"}
      </Button>}
    </CardBody>
  </Card>;
}
