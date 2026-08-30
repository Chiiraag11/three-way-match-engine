'use client';

export default function SubTabPills({
  items,
  activeId,
  onChange
}: {
  items: { id: string; label: string; isDuplicate?: boolean }[];
  activeId: string | null;
  onChange: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 px-4 py-2">No documents uploaded yet.</p>;
  }

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={`tab-pill ${activeId === it.id ? 'tab-pill-active' : 'tab-pill-inactive'}`}
        >
          {it.label}
          {it.isDuplicate && <span className="ml-1 text-rose-500">•dup</span>}
        </button>
      ))}
    </div>
  );
}
