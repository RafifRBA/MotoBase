import type { ReactNode } from "react";
import { Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import { describeError } from "@/lib/api";
import { Button } from "./button";

export function Spinner({ className = "size-6" }: { className?: string }) {
  return <LoaderCircle className={`${className} animate-spin text-brand-600`} aria-label="Memuat" />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <Inbox className="size-8 text-slate-400" aria-hidden />
      <p className="font-medium text-slate-800">{title}</p>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <TriangleAlert className="size-8 text-red-500" aria-hidden />
      <p className="font-medium text-slate-800">Data tidak dapat dimuat</p>
      <p className="max-w-sm text-sm text-slate-500">{describeError(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Muat ulang
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
