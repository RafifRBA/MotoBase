"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { useCan } from "@/components/role-gate";
import { useUsers } from "@/features/users/hooks";
import { isOpenStatus } from "@/lib/constants";
import { ACCESS } from "@/lib/permissions";
import { refId } from "@/lib/refs";
import type { ServiceOrder } from "@/types/models";
import { useAssignMechanic } from "../hooks";
import { MechanicInline } from "./ref-display";

export function AssignPanel({ order }: { order: ServiceOrder }) {
  const canAssign = useCan(ACCESS.orderAssign) && isOpenStatus(order.currentStatus);
  const current = refId(order.assignedMechanicId);
  const [selected, setSelected] = useState<string | null>(null);
  const mechanics = useUsers({ role: "MECHANIC", limit: 100 }, canAssign);
  const assign = useAssignMechanic(order.id);
  const value = selected ?? current;

  return (
    <Card>
      <CardHeader title="Mekanik" />
      <CardBody className="space-y-3">
        {!canAssign ? (
          <p className="text-sm text-slate-900"><MechanicInline value={order.assignedMechanicId} /></p>
        ) : (
          <>
            <Select value={value} onChange={(e) => setSelected(e.target.value)} aria-label="Pilih mekanik">
              <option value="">Belum ditugaskan</option>
              {mechanics.data?.items.filter((m) => m.isActive || m.id === current).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" disabled={value === current} loading={assign.isPending} onClick={() => assign.mutate(value || null, { onSuccess: () => setSelected(null) })}>
              {value ? "Tugaskan" : "Lepas mekanik"}
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}
