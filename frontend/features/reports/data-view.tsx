import { Card, CardBody, CardHeader, StatCard } from "@/components/ui/card";
import { formatDateTime, formatNumber, formatRupiah, humanizeKey, isIsoDate } from "@/lib/format";

const MONEY_KEY = /(pendapatan|revenue|harga|biaya|price|cost|amount|subtotal|^total$|grandtotal)/i;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number") return MONEY_KEY.test(key) ? formatRupiah(value) : formatNumber(value);
  if (isIsoDate(value)) return formatDateTime(value);
  if (isObj(value)) return String(value.name ?? value.title ?? JSON.stringify(value));
  return String(value);
}

function ArrayTable({ rows }: { rows: unknown[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">Tidak ada data pada periode ini.</p>;
  if (!isObj(rows[0])) return <ul className="list-disc pl-5 text-sm">{rows.map((r, i) => <li key={i}>{formatValue("", r)}</li>)}</ul>;
  const keys = Array.from(new Set(rows.slice(0, 20).flatMap((r) => (isObj(r) ? Object.keys(r) : [])))).filter((k) => !/^(_?id|__v)$/i.test(k));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-xs text-slate-500">
          <tr>{keys.map((k) => <th key={k} className="px-3 py-2 font-medium">{humanizeKey(k)}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => {
                const v = isObj(r) ? r[k] : undefined;
                return <td key={k} className={`px-3 py-2 ${typeof v === "number" ? "text-right" : ""}`}>{formatValue(k, v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Penampil laporan generik: angka tunggal jadi kartu, daftar jadi tabel. */
export function DataView({ data }: { data: unknown }) {
  if (Array.isArray(data)) return <ArrayTable rows={data} />;
  if (isObj(data)) {
    const entries = Object.entries(data);
    const scalars = entries.filter(([, v]) => !isObj(v) && !Array.isArray(v));
    const nested = entries.filter(([, v]) => isObj(v) || Array.isArray(v));
    return (
      <div className="space-y-6">
        {scalars.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {scalars.map(([k, v]) => <StatCard key={k} label={humanizeKey(k)} value={formatValue(k, v)} />)}
          </div>
        )}
        {nested.map(([k, v]) => (
          <Card key={k}>
            <CardHeader title={humanizeKey(k)} />
            <CardBody><DataView data={v} /></CardBody>
          </Card>
        ))}
      </div>
    );
  }
  return <p className="text-sm">{formatValue("", data)}</p>;
}
