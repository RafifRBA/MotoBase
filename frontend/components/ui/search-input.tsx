import type { ComponentProps } from "react";
import { Search } from "lucide-react";
import { Input } from "./form";
import { cn } from "@/lib/utils";

export function SearchInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <Input type="search" className="pl-9" {...props} />
    </div>
  );
}
