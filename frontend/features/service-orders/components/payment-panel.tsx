"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/form";
import { useCan } from "@/components/role-gate";
import { PAYMENT_METHODS, UNPAID, type PaymentMethodValue } from "@/lib/constants";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import type { ServiceOrder } from "@/types/models";
import { usePayOrder } from "../hooks";

export function PaymentPanel({ order }: { order: ServiceOrder }) {
  const canPay = useCan(ACCESS.orderPay);
  const pay = usePayOrder(order.id);
  const [method, setMethod] = useState<PaymentMethodValue>("TUNAI");
  const paid = !!order.paidAt || order.paymentStatus !== UNPAID;
  const payable = canPay && !paid && (order.currentStatus === "SELESAI" || order.currentStatus === "DIAMBIL");
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === order.paymentMethod)?.label ?? order.paymentMethod;

  return (
    <Card>
      <CardHeader title="Biaya dan pembayaran" action={<Badge tone={paid ? "green" : "amber"}>{paid ? "Lunas" : "Belum dibayar"}</Badge>} />
      <CardBody className="space-y-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-600">Biaya jasa</dt><dd>{formatRupiah(order.serviceCost)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-600">Suku cadang</dt><dd>{formatRupiah(order.partsSubtotal)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><dt>Total</dt><dd>{formatRupiah(order.grandTotal)}</dd></div>
        </dl>

        {paid && (
          <p className="text-sm text-slate-600">Dibayar via {methodLabel ?? "-"} pada {formatDateTime(order.paidAt)}.</p>
        )}

        {payable && (
          <div className="flex items-end gap-3">
            <Field label="Metode pembayaran" className="flex-1">
              <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethodValue)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
            <Button loading={pay.isPending} onClick={() => pay.mutate(method)}>Catat pembayaran</Button>
          </div>
        )}
        {canPay && !paid && !payable && order.currentStatus !== "DIBATALKAN" && (
          <p className="text-xs text-slate-500">Pembayaran dapat dicatat setelah servis berstatus Selesai.</p>
        )}
      </CardBody>
    </Card>
  );
}
