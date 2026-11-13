import { DashboardView } from "@/features/dashboard/dashboard-view";

// Data dimuat di sisi klien setelah login; segmen ini tidak diharapkan instan.
export const instant = false;

export default function DashboardPage() {
  return <DashboardView />;
}
