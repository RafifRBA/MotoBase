"use client";

import { useState } from "react";
import { Copy, ExternalLink, Link2Off, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clearTrackingToken, readTrackingToken, saveTrackingToken } from "@/lib/tracking-cache";
import type { ServiceOrder } from "@/types/models";
import { useTrackingToken } from "../hooks";

export function TrackingPanel({ order }: { order: ServiceOrder }) {
  const { rotate, revoke } = useTrackingToken(order.id);
  const [token, setToken] = useState<string | null>(() => order.trackingToken ?? readTrackingToken(order.id));
  const [revoking, setRevoking] = useState(false);
  const link = token && typeof window !== "undefined" ? `${window.location.origin}/track/${token}` : null;
  const active = order.trackingActive;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Tautan disalin");
    } catch {
      toast.error("Tidak dapat menyalin. Salin tautan secara manual.");
    }
  };

  return (
    <Card>
      <CardHeader title="Tautan pelacakan" description="Dibuka pelanggan tanpa akun." action={<Badge tone={active ? "green" : "gray"}>{active ? "Aktif" : "Dicabut"}</Badge>} />
      <CardBody className="space-y-3">
        {link && active ? (
          <>
            <p className="break-all rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{link}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={copy}><Copy className="size-3.5" aria-hidden /> Salin</Button>
              <a
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50"
                href={`https://wa.me/?text=${encodeURIComponent(`Pantau status servis motor Anda di sini: ${link}`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Share2 className="size-3.5" aria-hidden /> WhatsApp
              </a>
              <a className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50" href={link} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden /> Buka
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            {active ? "Token hanya ditampilkan saat dibuat. Terbitkan tautan baru untuk mendapatkan tautan yang bisa dibagikan." : "Tautan lama sudah tidak berlaku. Terbitkan tautan baru bila pelanggan perlu memantau lagi."}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <Button
            size="sm"
            variant="secondary"
            loading={rotate.isPending}
            onClick={() =>
              rotate.mutate(undefined, {
                onSuccess: (res) => {
                  if (res.trackingToken) {
                    saveTrackingToken(order.id, res.trackingToken);
                    setToken(res.trackingToken);
                  }
                },
              })
            }
          >
            <RefreshCw className="size-3.5" aria-hidden /> Terbitkan tautan baru
          </Button>
          {active && (
            <Button size="sm" variant="ghost" onClick={() => setRevoking(true)}><Link2Off className="size-3.5" aria-hidden /> Cabut</Button>
          )}
        </div>
      </CardBody>
      <ConfirmDialog
        open={revoking}
        onClose={() => setRevoking(false)}
        title="Cabut tautan pelacakan?"
        description="Tautan yang sudah dibagikan ke pelanggan tidak bisa dibuka lagi."
        confirmLabel="Cabut tautan"
        danger
        loading={revoke.isPending}
        onConfirm={() => revoke.mutate(undefined, { onSuccess: () => { clearTrackingToken(order.id); setToken(null); setRevoking(false); } })}
      />
    </Card>
  );
}
