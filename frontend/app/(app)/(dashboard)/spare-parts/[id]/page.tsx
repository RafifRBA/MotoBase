import { SparePartDetail } from "@/features/spare-parts/spare-part-detail";

export const instant = false;

export default async function SparePartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SparePartDetail id={id} />;
}
