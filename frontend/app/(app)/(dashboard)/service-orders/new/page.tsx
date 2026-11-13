import { RoleGate } from "@/components/role-gate";
import { PageHeader } from "@/components/ui/states";
import { OrderCreateForm } from "@/features/service-orders/components/order-create-form";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default function NewServiceOrderPage() {
  return (
    <RoleGate allow={ACCESS.orderCreate}>
      <PageHeader title="Servis baru" description="Terima motor, catat keluhan, dan dapatkan nomor antrean." />
      <OrderCreateForm />
    </RoleGate>
  );
}
