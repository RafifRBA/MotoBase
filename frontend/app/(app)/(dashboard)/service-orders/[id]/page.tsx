import { OrderDetail } from "@/features/service-orders/components/order-detail";

export const instant = false;

export default async function ServiceOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
