import type { Ref } from "@/types/models";

export function refId(ref: Ref | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref.id;
}

export function isPopulated<T extends object>(ref: Ref<T> | null | undefined): ref is T & { id: string } {
  return !!ref && typeof ref === "object";
}
