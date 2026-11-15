"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { useCan } from "@/components/role-gate";
import { STATUS_FLOW, STATUS_LABEL } from "@/lib/constants";
import type { ServiceOrder } from "@/types/models";
import { useSetStatus } from "../hooks";

/** Admin mengembalikan status satu tahap ke belakang (mis. salah klik). Alasan wajib. */
export function CorrectionPanel({ order }: { order: ServiceOrder }) {
  const isAdmin = useCan(["ADMIN"]);
  const mutation = useSetStatus(order.id);
  const [note, setNote] = useState("");

  const index = STATUS_FLOW.indexOf(order.currentStatus);
  if (!isAdmin || index <= 0) return null;

  const previous = STATUS_FLOW[index - 1];
  const submit = () =>
    mutation.mutate({ status: previous, note: note.trim(), isCorrection: true }, { onSuccess: () => setNote("") });

  return (
    <Card>
      <CardHeader title="Koreksi status" description="Khusus admin. Tercatat sebagai koreksi di riwayat." />
      <CardBody className="space-y-3">
        <Textarea rows={2} placeholder="Alasan koreksi (wajib)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Alasan koreksi status" />
        <Button variant="secondary" disabled={!note.trim()} loading={mutation.isPending} onClick={submit}>
          <Undo2 className="size-4" aria-hidden /> Kembalikan ke {STATUS_LABEL[previous]}
        </Button>
      </CardBody>
    </Card>
  );
}
