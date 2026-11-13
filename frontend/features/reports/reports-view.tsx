"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ErrorState, PageHeader, Spinner } from "@/components/ui/states";
import { useAuth } from "@/features/auth/auth-provider";
import { cn } from "@/lib/utils";
import { REPORTS, type ReportKey } from "./api";
import { DataView } from "./data-view";
import { useReport } from "./hooks";
import { RevenueView } from "./revenue-view";

export function ReportsView() {
  const { user } = useAuth();
  const tabs = REPORTS.filter((r) => user && r.roles.includes(user.role));
  const [active, setActive] = useState<ReportKey>(tabs[0]?.key ?? "service-summary");
  const [range, setRange] = useState({ from: "", to: "" });
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  const q = useReport(current.key, current.dateRange ? { from: range.from || undefined, to: range.to || undefined } : {});

  return (
    <>
      <PageHeader title="Laporan" description={current.description} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Jenis laporan">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === current.key}
            onClick={() => setActive(t.key)}
            className={cn("rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", t.key === current.key ? "bg-asphalt-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {current.dateRange && (
        <Card className="mb-6">
          <CardBody className="flex flex-wrap items-end gap-4">
            <Field label="Dari tanggal"><Input type="date" value={range.from} max={range.to || undefined} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
            <Field label="Sampai tanggal"><Input type="date" value={range.to} min={range.from || undefined} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
            {(range.from || range.to) && (
              <button type="button" className="pb-2 text-sm font-medium text-brand-700 hover:underline" onClick={() => setRange({ from: "", to: "" })}>Hapus filter</button>
            )}
          </CardBody>
        </Card>
      )}

      {q.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : current.key === "revenue-summary" ? (
        <RevenueView data={q.data} />
      ) : (
        <Card><CardBody><DataView data={q.data} /></CardBody></Card>
      )}
    </>
  );
}
