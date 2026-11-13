import { VehicleList } from "@/features/vehicles/vehicle-list";

// Data dimuat di sisi klien setelah login; segmen ini tidak diharapkan instan.
export const instant = false;

export default function VehiclesPage() {
  return <VehicleList />;
}
