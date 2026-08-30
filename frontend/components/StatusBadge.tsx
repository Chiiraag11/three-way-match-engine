const STYLES: Record<string, string> = {
  matched: 'bg-emerald-100 text-emerald-800',
  partially_matched: 'bg-amber-100 text-amber-800',
  mismatch: 'bg-rose-100 text-rose-800',
  insufficient_documents: 'bg-slate-200 text-slate-700'
};

const LABELS: Record<string, string> = {
  matched: 'Matched',
  partially_matched: 'Partially Matched',
  mismatch: 'Mismatch',
  insufficient_documents: 'Insufficient Documents'
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STYLES[status] || 'bg-slate-200 text-slate-700'}`}>
      {LABELS[status] || status}
    </span>
  );
}
