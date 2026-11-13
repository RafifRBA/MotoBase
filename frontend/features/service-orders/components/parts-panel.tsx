"use client";

import { useState } from "react";
import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/form";
import { useCan } from "@/components/role-gate";
import { SparePartPicker } from "@/features/spare-parts/spare-part-picker";
import { isOpenStatus } from "@/lib/constants";
import { formatRupiah } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { isPopulated } from "@/lib/refs";
import type { ServiceOrder, SparePart, UsedPart } from "@/types/models";
import { useAddPart, useRemovePart } from "../hooks";

const usageId = (u: UsedPart) => u.usageId ?? u.id ?? "";
const partName = (u: UsedPart) => u.name ?? (isPopulated(u.sparePartId) ? u.sparePartId.name : undefined) ?? "Suku cadang";
const unitPrice = (u: UsedPart) => u.unitPrice ?? u.sellingPrice;
const isCancelled = (u: UsedPart) => !!u.isCancelled || !!u.cancelledAt;

export function PartsPanel({ order }: { order: ServiceOrder }) {
  const canEdit = useCan(ACCESS.orderParts) && isOpenStatus(order.currentStatus);
  const add = useAddPart(order.id);
  const remove = useRemovePart(order.id);
  const [part, setPart] = useState<SparePart | null>(null);
  const [qty, setQty] = useState("1");
  const [removing, setRemoving] = useState<UsedPart | null>(null);

  const quantity = Number(qty);
  const qtyError = !/^[1-9]\d*$/.test(qty) ? "Jumlah minimal 1" : part && quantity > part.currentStock ? `Stok hanya ${part.currentStock} ${part.unit}` : undefined;

  return (
    <Card>
      <CardHeader title="Suku cadang terpakai" description="Stok berkurang otomatis saat dicatat." />
      <div className="overflow-x-auto">
        {order.usedParts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">Belum ada suku cadang yang dipakai.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Nama</th>
                <th className="px-4 py-2 text-right font-medium">Jumlah</th>
                <th className="px-4 py-2 text-right font-medium">Harga</th>
                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                {canEdit && <th className="px-4 py-2"><span className="sr-only">Aksi</span></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.usedParts.map((u, i) => {
                const cancelled = isCancelled(u);
                const price = unitPrice(u);
                return (
                  <tr key={usageId(u) || i} className={cancelled ? "text-slate-400 line-through" : ""}>
                    <td className="px-4 py-2.5">{partName(u)}{cancelled && <span className="ml-2 text-xs no-underline">(dibatalkan)</span>}</td>
                    <td className="px-4 py-2.5 text-right">{u.quantity}</td>
                    <td className="px-4 py-2.5 text-right">{formatRupiah(price)}</td>
                    <td className="px-4 py-2.5 text-right">{formatRupiah(u.subtotal ?? (price != null ? price * u.quantity : undefined))}</td>
                    {canEdit && (
                      <td className="px-4 py-2.5 text-right">
                        {!cancelled && usageId(u) && (
                          <Button size="sm" variant="ghost" onClick={() => setRemoving(u)} aria-label={`Batalkan pemakaian ${partName(u)}`}>
                            <Undo2 className="size-3.5" aria-hidden /> Batalkan
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && (
        <CardBody className="space-y-3 border-t border-slate-200">
          <p className="text-sm font-medium text-slate-900">Catat pemakaian</p>
          <SparePartPicker value={part} onChange={setPart} />
          <div className="flex items-end gap-3">
            <Field label="Jumlah" error={part ? qtyError : undefined} className="w-32">
              <Input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
            </Field>
            <Button
              disabled={!part || !!qtyError}
              loading={add.isPending}
              onClick={() => part && add.mutate({ sparePartId: part.id, quantity }, { onSuccess: () => { setPart(null); setQty("1"); } })}
            >
              Catat pemakaian
            </Button>
          </div>
        </CardBody>
      )}

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Batalkan pemakaian?"
        description={removing ? `${removing.quantity} × ${partName(removing)} akan dikembalikan ke stok. Riwayat tetap tersimpan sebagai catatan pembalik.` : ""}
        confirmLabel="Batalkan pemakaian"
        danger
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(usageId(removing), { onSuccess: () => setRemoving(null) })}
      />
    </Card>
  );
}
