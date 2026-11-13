import { RoleGate } from "@/components/role-gate";
import { CustomerServices } from "@/features/customer-portal/portal-view";
import { ACCESS } from "@/lib/permissions";
export const instant = false;
export default function Page() { return <RoleGate allow={ACCESS.customer}><CustomerServices /></RoleGate>; }
