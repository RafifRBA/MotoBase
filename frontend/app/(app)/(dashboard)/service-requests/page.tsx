import { RoleGate } from "@/components/role-gate";
import { ServiceRequestInbox } from "@/features/customer-portal/portal-view";
export const instant = false;
export default function Page() { return <RoleGate allow={["ADMIN"]}><ServiceRequestInbox /></RoleGate>; }
