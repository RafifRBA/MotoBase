import { Suspense } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { FullPageSpinner } from "@/components/ui/states";

// Seluruh data dimuat di sisi klien setelah login, jadi segmen ini tidak diharapkan instan.
export const instant = false;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // usePathname/useParams dibaca saat runtime, jadi dibungkus Suspense (Cache Components).
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
