'use client';

type MatchItem = {
  key?: string;
  skuMasterId: string | null;
  skuMasterName: string | null;
  erpCode: string | null;
  eanCode: string | null;
  hsnCode: string | null;
  uom: string | null;
  itemCode: string;
  description: string;
  poQty: number;
  grnQty: number;
  invoiceQty: number;
  unitRate: number | null;
  mrp: number | null;
  grossAmount: number | null;
  reasons: string[];
};

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function ItemGrid({ items }: { items: MatchItem[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
          <tr>
            <th className="px-3 py-2 text-left">SKU Name</th>
            <th className="px-3 py-2 text-left">SKU ID</th>
            <th className="px-3 py-2 text-left">Mapped SKU Name</th>
            <th className="px-3 py-2 text-left">ERP Code</th>
            <th className="px-3 py-2 text-left">EAN</th>
            <th className="px-3 py-2 text-left">HSN</th>
            <th className="px-3 py-2 text-left">UOM</th>
            <th className="px-3 py-2 text-right">PO Qty</th>
            <th className="px-3 py-2 text-right">GRN Qty</th>
            <th className="px-3 py-2 text-right">Inv Qty</th>
            <th className="px-3 py-2 text-right">Unit Price</th>
            <th className="px-3 py-2 text-right">Unit MRP</th>
            <th className="px-3 py-2 text-right">Gross Amount</th>
            <th className="px-3 py-2 text-left">Flags</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const priceMismatch = item.reasons.includes('price_mismatch');
            const mrpMismatch = item.reasons.includes('mrp_mismatch');
            const unmapped = item.reasons.includes('unmapped_master_sku');
            const missingInPo = item.reasons.includes('item_missing_in_po');
            const qtyExceeds = item.reasons.some((r) => r.includes('qty_exceeds'));

            return (
              <tr key={item.skuMasterId || item.itemCode || idx} className="border-t border-slate-100">
                <td className="px-3 py-2">{item.description || '—'}</td>
                <td className={`px-3 py-2 ${unmapped ? 'mismatch-cell' : ''}`}>{item.itemCode || '—'}</td>
                <td className="px-3 py-2">{item.skuMasterName || (unmapped ? 'Unmapped' : '—')}</td>
                <td className="px-3 py-2">{item.erpCode || '—'}</td>
                <td className="px-3 py-2">{item.eanCode || '—'}</td>
                <td className="px-3 py-2">{item.hsnCode || '—'}</td>
                <td className="px-3 py-2">{item.uom || '—'}</td>
                <td className={`px-3 py-2 text-right ${missingInPo ? 'mismatch-cell' : ''}`}>{fmt(item.poQty)}</td>
                <td className={`px-3 py-2 text-right ${qtyExceeds ? 'mismatch-cell' : ''}`}>{fmt(item.grnQty)}</td>
                <td className={`px-3 py-2 text-right ${qtyExceeds ? 'mismatch-cell' : ''}`}>{fmt(item.invoiceQty)}</td>
                <td className={`px-3 py-2 text-right ${priceMismatch ? 'mismatch-cell' : ''}`}>{fmt(item.unitRate)}</td>
                <td className={`px-3 py-2 text-right ${mrpMismatch ? 'mismatch-cell' : ''}`}>{fmt(item.mrp)}</td>
                <td className="px-3 py-2 text-right">{fmt(item.grossAmount)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {item.reasons.map((r) => (
                      <span key={r} className="badge bg-rose-50 text-rose-700 border border-rose-200">
                        {r.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr>
              <td colSpan={14} className="px-3 py-6 text-center text-slate-400">
                No items to display
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
