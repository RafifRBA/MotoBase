import { OrderList } from "@/features/service-orders/components/order-list";

// Data dimuat di sisi klien setelah login; segmen ini tidak diharapkan instan.
export const instant = false;

export default function ServiceOrdersPage() {
  return <OrderList />;
}
