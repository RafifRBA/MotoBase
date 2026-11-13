import { VehicleDetail } from "@/features/vehicles/vehicle-detail";

export const instant = false;

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VehicleDetail id={id} />;
}
