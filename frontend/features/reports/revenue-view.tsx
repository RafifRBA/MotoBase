import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { formatRupiah } from "@/lib/format";
import { DataView } from "./data-view";

interface Revenue {
  totalPendapatan: number;
  pendapatanJasa: number;
  pendapatanSukuCadang: number;
  jumlahTransaksi: number;
  perMetodePembayaran?: { metode: string; total: number; jumlah: number }[];
  belumDibayar?: { total: number; jumlah: number };
}

export function RevenueView({ data }: { data: unknown }) {
  const r = data as Partial<Revenue> | null;
  if (!r || typeof r.totalPendapatan !== "number") return <DataView data={data} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total pendapatan" value={formatRupiah(r.totalPendapatan)} hint={`${r.jumlahTransaksi ?? 0} transaksi lunas`} />
        <StatCard label="Dari jasa" value={formatRupiah(r.pendapatanJasa)} />
        <StatCard label="Dari suku cadang" value={formatRupiah(r.pendapatanSukuCadang)} />
        <StatCard label="Belum dibayar" value={formatRupiah(r.belumDibayar?.total ?? 0)} hint={`${r.belumDibayar?.jumlah ?? 0} servis`} />
      </div>
      {r.perMetodePembayaran && r.perMetodePembayaran.length > 0 && (
        <Card>
          <CardHeader title="Per metode pembayaran" />
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500">
              <tr><th className="px-4 py-2 font-medium">Metode</th><th className="px-4 py-2 text-right font-medium">Transaksi</th><th className="px-4 py-2 text-right font-medium">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.perMetodePembayaran.map((m) => (
                <tr key={m.metode}><td className="px-4 py-2.5">{m.metode}</td><td className="px-4 py-2.5 text-right">{m.jumlah}</td><td className="px-4 py-2.5 text-right">{formatRupiah(m.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
