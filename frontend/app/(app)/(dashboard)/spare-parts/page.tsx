import { SparePartList } from "@/features/spare-parts/spare-part-list";

// Data dimuat di sisi klien setelah login; segmen ini tidak diharapkan instan.
export const instant = false;

export default function SparePartsPage() {
  return <SparePartList />;
}
