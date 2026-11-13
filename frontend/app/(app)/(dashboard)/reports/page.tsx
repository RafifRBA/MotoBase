import { RoleGate } from "@/components/role-gate";
import { ReportsView } from "@/features/reports/reports-view";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default function ReportsPage() {
  return (
    <RoleGate allow={ACCESS.reports}>
      <ReportsView />
    </RoleGate>
  );
}
