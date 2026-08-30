'use client';

import StatusBadge from './StatusBadge';

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-IN');
}

type SummaryRow = {
  type: string;
  documentNumber: string;
  date: string | null;
  quantity: number;
  amount: number | null;
  isDuplicate?: boolean;
  isSummaryRow?: boolean;
};

export default function SummaryTab({
  summary
}: {
  summary: {
    stats: { poAmount: number; totalInvoiced: number; totalReceived: number };
    pendingDeliveryQty: number;
    pendingInvoiceQty: number;
    status: string;
    rows: SummaryRow[];
  };
}) {
  const { stats, rows, pendingDeliveryQty, pendingInvoiceQty, status } = summary;

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400 tracking-wide">PO Amount</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{fmtMoney(stats.poAmount)}</p>
          <p className="text-xs text-slate-400 mt-1">Estimated from agreed rate × PO qty</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400 tracking-wide">Total Invoiced</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{fmtMoney(stats.totalInvoiced)}</p>
          <p className="text-xs text-slate-400 mt-1">Pending: {pendingInvoiceQty} units</p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400 tracking-wide">Total Received</p>
          <p className="text-2xl font-semibold text-slate-800 mt-1">{stats.totalReceived}</p>
          <p className="text-xs text-slate-400 mt-1">Pending delivery: {pendingDeliveryQty} units</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-700">Associated Invoice &amp; GRN</h3>
        <StatusBadge status={status} />
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Document No.</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Quantity</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className={`border-t border-slate-100 ${
                  row.isSummaryRow ? 'bg-slate-50 font-semibold' : ''
                } ${row.isDuplicate ? 'bg-rose-50' : ''}`}
              >
                <td className="px-3 py-2">{row.type}</td>
                <td className="px-3 py-2">
                  {row.isSummaryRow ? <StatusBadge status={row.documentNumber} /> : row.documentNumber}
                  {row.isDuplicate && <span className="ml-2 text-xs text-rose-600">duplicate</span>}
                </td>
                <td className="px-3 py-2">{fmtDate(row.date)}</td>
                <td className="px-3 py-2 text-right">{row.quantity}</td>
                <td className="px-3 py-2 text-right">{fmtMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
