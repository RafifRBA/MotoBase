"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { LinkButton } from "@/components/ui/link-button";
import { ErrorState, FullPageSpinner, PageHeader } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { CustomerInline } from "@/features/service-orders/components/ref-display";
import { StatusBadge } from "@/features/service-orders/components/status-badge";
import { ACCESS } from "@/lib/permissions";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useSaveVehicle, useVehicle, useVehicleOrders } from "./hooks";
import { VehicleForm } from "./vehicle-form";

export function VehicleDetail({ id }: { id: string }) {
  const canWrite = useCan(ACCESS.vehiclesWrite);
  const [editing, setEditing] = useState(false);
  const vehicle = useVehicle(id);
  const orders = useVehicleOrders(id, { limit: 15 });
  const save = useSaveVehicle(id);

  if (vehicle.isLoading) return <FullPageSpinner />;
  if (vehicle.isError || !vehicle.data) return <ErrorState error={vehicle.error} onRetry={() => vehicle.refetch()} />;
  const v = vehicle.data;

  return (
    <>
      <PageHeader
        title={v.licensePlate}
        description={`${v.brand} ${v.model}`}
        actions={
          <>
            <LinkButton href="/vehicles" variant="secondary">Kembali</LinkButton>
            {canWrite && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden /> Ubah / pindah pemilik
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader title="Data kendaraan" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Pemilik", value: <CustomerInline value={v.customerId} /> },
                { label: "Merek", value: v.brand },
                { label: "Model", value: v.model },
                { label: "Tahun", value: v.year ?? "-" },
                { label: "Warna", value: v.color ?? "-" },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Riwayat servis" description="Dirujuk mekanik saat servis berikutnya" />
          <DataTable
            loading={orders.isLoading}
            rows={orders.data?.items ?? []}
            rowKey={(o) => o.id}
            emptyTitle="Belum ada riwayat servis"
            columns={[
              { header: "No. order", cell: (o) => <Link href={`/service-orders/${o.id}`} className="font-medium text-brand-700 hover:underline">{o.orderNumber}</Link> },
              { header: "Tanggal", cell: (o) => formatDateTime(o.serviceDate) },
              { header: "Keluhan", cell: (o) => <span className="line-clamp-1">{o.complaint}</span> },
              { header: "Status", cell: (o) => <StatusBadge status={o.currentStatus} /> },
              { header: "Total", className: "text-right", cell: (o) => formatRupiah(o.grandTotal) },
            ]}
          />
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Ubah kendaraan" size="lg">
        <VehicleForm
          defaultValues={v}
          loading={save.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            const ok = await save.mutateAsync(body).then(() => true, () => false);
            if (ok) setEditing(false);
          }}
        />
      </Modal>
    </>
  );
}
