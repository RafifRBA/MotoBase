import { RoleGate } from "@/components/role-gate";
import { CustomerDetail } from "@/features/customers/customer-detail";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RoleGate allow={ACCESS.customersRead}>
      <CustomerDetail id={id} />
    </RoleGate>
  );
}
