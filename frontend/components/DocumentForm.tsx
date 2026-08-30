'use client';

const ACCENT_BY_STATUS: Record<string, string> = {
  matched: 'border-emerald-500',
  partially_matched: 'border-amber-500',
  mismatch: 'border-rose-500',
  insufficient_documents: 'border-slate-400'
};

export default function DocumentForm({
  title,
  fields,
  status,
  bannerText
}: {
  title: string;
  fields: { label: string; value: string }[];
  status?: string;
  bannerText?: string | null;
}) {
  return (
    <div className="space-y-3">
      {bannerText && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium rounded-md px-3 py-2">
          {bannerText}
        </div>
      )}
      <div className={`section-accent ${status ? ACCENT_BY_STATUS[status] || 'border-slate-300' : 'border-slate-300'}`}>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-slate-400 text-xs uppercase tracking-wide">{f.label}</dt>
              <dd className="text-slate-800 font-medium">{f.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
