import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "gray" | "blue" | "amber" | "green" | "red" | "violet" | "orange";

const TONE: Record<Tone, string> = {
  gray: "bg-slate-200 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-900",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  violet: "bg-violet-100 text-violet-800",
  orange: "bg-brand-100 text-brand-900",
};

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}
