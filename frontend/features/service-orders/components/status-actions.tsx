"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/form";
import { STATUS_LABEL, isOpenStatus, nextStatus } from "@/lib/constants";
import type { ServiceOrder } from "@/types/models";
import { useSetStatus } from "../hooks";

export function StatusActions({ order }: { order: ServiceOrder }) {
  const [note, setNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const mutation = useSetStatus(order.id);
  const next = nextStatus(order.currentStatus);
  const canCancel = isOpenStatus(order.currentStatus);

  if (!next && !canCancel) {
    return (
      <Card>
        <CardHeader title="Status" />
        <CardBody><p className="text-sm text-slate-600">Servis sudah final ({STATUS_LABEL[order.currentStatus]}). Status tidak dapat diubah lagi.</p></CardBody>
      </Card>
    );
  }

  const run = (status: typeof order.currentStatus) =>
    mutation.mutate({ status, note: note.trim() || undefined }, { onSuccess: () => { setNote(""); setCancelling(false); } });

  return (
    <Card>
      <CardHeader title="Perbarui status" description="Status berjalan bertahap dan tidak dapat melompat." />
      <CardBody className="space-y-3">
        <Textarea rows={2} placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Catatan perubahan status" />
        <div className="flex flex-wrap gap-2">
          {next && (
            <Button loading={mutation.isPending && !cancelling} onClick={() => run(next)}>
              Ubah ke {STATUS_LABEL[next]}
            </Button>
          )}
          {canCancel && (
            <Button variant="secondary" onClick={() => setCancelling(true)}>
              <Ban className="size-4" aria-hidden /> Batalkan servis
            </Button>
          )}
        </div>
      </CardBody>
      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        title="Batalkan servis ini?"
        description="Servis akan ditandai Dibatalkan dan tidak bisa dilanjutkan. Suku cadang yang sudah dipakai perlu dibatalkan terpisah agar stok kembali."
        confirmLabel="Ya, batalkan"
        danger
        loading={mutation.isPending}
        onConfirm={() => run("DIBATALKAN")}
      />
    </Card>
  );
}
