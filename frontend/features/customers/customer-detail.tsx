"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, DescriptionList } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ErrorState, FullPageSpinner, PageHeader } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/link-button";
import { useCan } from "@/components/role-gate";
import { StatusBadge } from "@/features/service-orders/components/status-badge";
import { VehicleForm } from "@/features/vehicles/vehicle-form";
import { useSaveVehicle } from "@/features/vehicles/hooks";
import { ACCESS } from "@/lib/permissions";
import { formatDate, formatPhone, formatRupiah } from "@/lib/format";
import { CustomerForm } from "./customer-form";
import { useCustomer, useCustomerOrders, useCustomerVehicles, useSaveCustomer } from "./hooks";

export function CustomerDetail({ id }: { id: string }) {
  const canWrite = useCan(ACCESS.customersWrite);
  const [editing, setEditing] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const customer = useCustomer(id);
  const vehicles = useCustomerVehicles(id);
  const orders = useCustomerOrders(id, { limit: 10 });
  const saveCustomer = useSaveCustomer(id);
  const saveVehicle = useSaveVehicle();

  if (customer.isLoading) return <FullPageSpinner />;
  if (customer.isError || !customer.data) return <ErrorState error={customer.error} onRetry={() => customer.refetch()} />;
  const c = customer.data;

  return (
    <>
      <PageHeader
        title={c.name}
        description={`Terdaftar ${formatDate(c.createdAt)}`}
        actions={
          <>
            <LinkButton href="/customers" variant="secondary">Kembali</LinkButton>
            {canWrite && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden /> Ubah data
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Kontak" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Telepon", value: formatPhone(c.phone) },
                  { label: "Surel", value: c.email ?? "-" },
                  { label: "Alamat", value: c.address ?? "-" },
                  { label: "Catatan", value: c.notes ?? "-" },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Kendaraan"
              action={canWrite && <Button size="sm" variant="secondary" onClick={() => setAddingVehicle(true)}><Plus className="size-3.5" aria-hidden /> Tambah</Button>}
            />
            <DataTable
              loading={vehicles.isLoading}
              rows={vehicles.data?.items ?? []}
              rowKey={(v) => v.id}
              emptyTitle="Belum ada kendaraan"
              columns={[
                { header: "Plat", cell: (v) => <Link href={`/vehicles/${v.id}`} className="font-medium text-brand-700 hover:underline">{v.licensePlate}</Link> },
                { header: "Motor", cell: (v) => `${v.brand} ${v.model}` },
              ]}
            />
          </Card>
        </div>

        <Card>
          <CardHeader title="Riwayat servis" description="10 servis terakhir" />
          <DataTable
            loading={orders.isLoading}
            rows={orders.data?.items ?? []}
            rowKey={(o) => o.id}
            emptyTitle="Belum ada riwayat servis"
            columns={[
              { header: "No. order", cell: (o) => <Link href={`/service-orders/${o.id}`} className="font-medium text-brand-700 hover:underline">{o.orderNumber}</Link> },
              { header: "Tanggal", cell: (o) => formatDate(o.serviceDate) },
              { header: "Status", cell: (o) => <StatusBadge status={o.currentStatus} /> },
              { header: "Total", className: "text-right", cell: (o) => formatRupiah(o.grandTotal) },
            ]}
          />
        </Card>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Ubah data pelanggan">
        <CustomerForm
          defaultValues={c}
          loading={saveCustomer.isPending}
          onCancel={() => setEditing(false)}
          onSubmit={async (body) => {
            const ok = await saveCustomer.mutateAsync(body).then(() => true, () => false);
            if (ok) setEditing(false);
          }}
        />
      </Modal>

      <Modal open={addingVehicle} onClose={() => setAddingVehicle(false)} title="Tambah kendaraan">
        <VehicleForm
          fixedCustomer={c}
          loading={saveVehicle.isPending}
          submitLabel="Daftarkan"
          onCancel={() => setAddingVehicle(false)}
          onSubmit={async (body) => {
            const ok = await saveVehicle.mutateAsync(body).then(() => true, () => false);
            if (ok) setAddingVehicle(false);
          }}
        />
      </Modal>
    </>
  );
}
