import { RoleGate } from "@/components/role-gate";
import { CustomerList } from "@/features/customers/customer-list";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default function CustomersPage() {
  return (
    <RoleGate allow={ACCESS.customersRead}>
      <CustomerList />
    </RoleGate>
  );
}
