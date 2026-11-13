import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { EmptyState, Spinner } from "./states";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, rows, rowKey, loading, emptyTitle = "Belum ada data", emptyDescription, onRowClick }: DataTableProps<T>) {
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.header} className={cn("px-4 py-2.5 font-medium", c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer hover:bg-slate-50")}
            >
              {columns.map((c) => (
                <td key={c.header} className={cn("px-4 py-3 align-middle", c.className)}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
