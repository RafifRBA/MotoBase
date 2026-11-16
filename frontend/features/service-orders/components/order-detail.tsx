"use client";

import { Card, CardBody, CardHeader, DescriptionList } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ErrorState, FullPageSpinner } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { isFinalStatus } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { useOrder } from "../hooks";
import { AssignPanel } from "./assign-panel";
import { CorrectionPanel } from "./correction-panel";
import { CustomerInline, VehicleInline } from "./ref-display";
import { OrderInfoForm } from "./order-info-form";
import { PartsPanel } from "./parts-panel";
import { PaymentPanel } from "./payment-panel";
import { StatusActions } from "./status-actions";
import { StatusBadge } from "./status-badge";
import { StatusTimeline } from "./status-timeline";
import { TrackingPanel } from "./tracking-panel";
import { ReceiptPanel } from "./receipt-panel";

export function OrderDetail({ id }: { id: string }) {
  const q = useOrder(id);
  const canEdit = useCan(ACCESS.orderEdit);
  const canTrack = useCan(ACCESS.orderTracking);

  if (q.isLoading) return <FullPageSpinner />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const o = q.data;
  const editable = canEdit && !isFinalStatus(o.currentStatus);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-xl bg-asphalt-900 text-center text-white" aria-label={`Nomor antrean ${o.queueNumber}`}>
            <div>
              <p className="text-[10px] leading-none text-slate-400">ANTRE</p>
              <p className="text-2xl font-bold leading-tight text-brand-500">{String(o.queueNumber).padStart(3, "0")}</p>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{o.orderNumber}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <StatusBadge status={o.currentStatus} />
              <span>Masuk {formatDateTime(o.createdAt)}</span>
            </p>
          </div>
        </div>
        <LinkButton href="/service-orders" variant="secondary">Kembali</LinkButton>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Pelanggan dan kendaraan" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Pelanggan", value: <CustomerInline value={o.customerId} showPhone /> },
                  { label: "Kendaraan", value: <VehicleInline value={o.vehicleId} /> },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Keluhan dan diagnosis" />
            <CardBody>
              {editable ? (
                <OrderInfoForm key={`${o.complaint}|${o.diagnosis}|${o.serviceCost}`} order={o} />
              ) : (
                <DescriptionList items={[{ label: "Keluhan", value: o.complaint }, { label: "Diagnosis", value: o.diagnosis ?? "-" }]} />
              )}
            </CardBody>
          </Card>

          <PartsPanel order={o} />
          <PaymentPanel order={o} />
          <ReceiptPanel order={o} />
        </div>

        <div className="space-y-6">
          {canEdit && <StatusActions order={o} />}
          <CorrectionPanel order={o} />
          <AssignPanel order={o} />
          {canTrack && <TrackingPanel order={o} />}
          <Card>
            <CardHeader title="Riwayat status" />
            <CardBody><StatusTimeline history={o.statusHistory} /></CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
