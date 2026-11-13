"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CustomerPicker } from "@/features/customers/customer-picker";
import { useUsers } from "@/features/users/hooks";
import { VehiclePicker } from "@/features/vehicles/vehicle-picker";
import { describeError } from "@/lib/api";
import { intString } from "@/lib/forms";
import { saveTrackingToken } from "@/lib/tracking-cache";
import type { Customer } from "@/types/models";
import { ordersApi } from "../api";
import { useCreateOrder } from "../hooks";

const schema = z.object({
  complaint: z.string().trim().min(3, "Tuliskan keluhan pelanggan"),
  serviceCost: intString("Biaya jasa"),
  mechanicId: z.string(),
});
type Values = z.infer<typeof schema>;

/**
 * Bukan elemen <form>: picker membuka modal berisi form lain, dan form tidak boleh bersarang.
 */
export function OrderCreateForm() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [pickError, setPickError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mechanics = useUsers({ role: "MECHANIC", limit: 100 });
  const create = useCreateOrder();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { complaint: "", serviceCost: "0", mechanicId: "" } });

  const submit = handleSubmit(async (v) => {
    if (!customer) return setPickError("Pilih pelanggan terlebih dahulu");
    if (!vehicleId) return setPickError("Pilih kendaraan yang diservis");
    setPickError(null);
    setSaving(true);
    try {
      const order = await create.mutateAsync({ customerId: customer.id, vehicleId, complaint: v.complaint, serviceCost: Number(v.serviceCost) });
      if (order.trackingToken) saveTrackingToken(order.id, order.trackingToken);
      if (v.mechanicId) {
        try {
          await ordersApi.assignMechanic(order.id, v.mechanicId);
        } catch (e) {
          toast.error(`Servis tersimpan, tetapi mekanik belum ditugaskan: ${describeError(e)}`);
        }
      }
      router.push(`/service-orders/${order.id}`);
    } catch {
      // Pesan galat sudah ditampilkan oleh mutation.
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="1. Pelanggan" description="Cari pelanggan lama atau daftarkan yang baru." />
          <CardBody>
            <CustomerPicker value={customer} onChange={(c) => { setCustomer(c); setVehicleId(""); }} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="2. Kendaraan" />
          <CardBody>
            {customer ? (
              <VehiclePicker customer={customer} value={vehicleId} onChange={setVehicleId} />
            ) : (
              <p className="text-sm text-slate-500">Pilih pelanggan dulu untuk melihat kendaraannya.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader title="3. Detail servis" />
        <CardBody className="space-y-4">
          <Field label="Keluhan" error={errors.complaint?.message}>
            <Textarea placeholder="Mis. mesin sulit menyala" {...register("complaint")} />
          </Field>
          <Field label="Biaya jasa awal (Rp)" error={errors.serviceCost?.message} hint="Bisa diubah nanti. Total dihitung otomatis.">
            <Input inputMode="numeric" {...register("serviceCost")} />
          </Field>
          <Field label="Mekanik (opsional)">
            <Select {...register("mechanicId")}>
              <option value="">Tentukan nanti</option>
              {mechanics.data?.items.filter((m) => m.isActive).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
          {pickError && <p role="alert" className="text-sm text-red-600">{pickError}</p>}
          <Button loading={saving} onClick={submit} className="w-full">Catat servis</Button>
        </CardBody>
      </Card>
    </div>
  );
}
