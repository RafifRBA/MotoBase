import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function LinkButton({ className, variant = "primary", ...props }: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" }) {
  return (
    <Link
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
        variant === "primary" ? "bg-brand-600 text-white hover:bg-brand-700" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        className,
      )}
      {...props}
    />
  );
}
