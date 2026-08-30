'use client';

export type TopTabKey = 'po' | 'fulfillment' | 'delivery' | 'summary';

export default function TopTabs({
  active,
  onChange,
  invoiceCount,
  grnCount
}: {
  active: TopTabKey;
  onChange: (key: TopTabKey) => void;
  invoiceCount: number;
  grnCount: number;
}) {
  const tabs: { key: TopTabKey; label: string; count?: number }[] = [
    { key: 'po', label: 'Purchase Order', count: 1 },
    { key: 'fulfillment', label: 'Fulfillment', count: invoiceCount },
    { key: 'delivery', label: 'Delivery', count: grnCount },
    { key: 'summary', label: 'Summary' }
  ];

  return (
    <div className="flex gap-2 border-b border-slate-200 bg-white px-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px flex items-center gap-2 ${
            active === t.key ? 'border-brand-teal text-brand-teal' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="badge bg-slate-100 text-slate-600">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
