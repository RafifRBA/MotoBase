import { RoleGate } from "@/components/role-gate";
import { CustomerProfile } from "@/features/customer-portal/profile-view";
import { ACCESS } from "@/lib/permissions";
export const instant = false;
export default function Page() { return <RoleGate allow={ACCESS.customer}><CustomerProfile /></RoleGate>; }
