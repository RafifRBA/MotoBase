import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/constants";
import type { ServiceStatus } from "@/types/models";

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
