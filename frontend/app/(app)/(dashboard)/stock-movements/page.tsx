import { RoleGate } from "@/components/role-gate";
import { MovementList } from "@/features/spare-parts/movement-list";
import { ACCESS } from "@/lib/permissions";

export const instant = false;

export default function StockMovementsPage() {
  return (
    <RoleGate allow={ACCESS.stockRead}>
      <MovementList />
    </RoleGate>
  );
}
