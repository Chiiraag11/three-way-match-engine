'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthGuard } from '../../lib/useAuthGuard';
import { listSkuMasters, createSkuMaster, updateSkuMaster, deleteSkuMaster } from '../../lib/queries';
import { ApiError } from '../../lib/api';
import AppShell from '../../components/AppShell';

const emptyForm = {
  skuErpCode: '',
  name: '',
  eanCode: '',
  hsnCode: '',
  uom: '',
  agreedRate: '',
  mrp: '',
  priceTolerance: '0.05'
};

export default function MastersPage() {
  const ready = useAuthGuard();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: masters, isLoading } = useQuery({
    queryKey: ['skuMasters'],
    queryFn: listSkuMasters,
    enabled: ready
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['skuMasters'] });

  const createMutation = useMutation({
    mutationFn: () => createSkuMaster(toPayload(form)),
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Create failed')
  });

  const updateMutation = useMutation({
    mutationFn: () => updateSkuMaster(editingId as string, toPayload(form)),
    onSuccess: () => {
      invalidate();
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Update failed')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSkuMaster(id),
    onSuccess: () => invalidate(),
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'Delete failed')
  });

  function toPayload(f: typeof emptyForm) {
    return {
      skuErpCode: f.skuErpCode,
      name: f.name,
      eanCode: f.eanCode || null,
      hsnCode: f.hsnCode || null,
      uom: f.uom || null,
      agreedRate: f.agreedRate === '' ? 0 : Number(f.agreedRate),
      mrp: f.mrp === '' ? 0 : Number(f.mrp),
      priceTolerance: f.priceTolerance === '' ? 0.05 : Number(f.priceTolerance)
    };
  }

  function startEdit(m: any) {
    setEditingId(m._id);
    setForm({
      skuErpCode: m.skuErpCode || '',
      name: m.name || '',
      eanCode: m.eanCode || '',
      hsnCode: m.hsnCode || '',
      uom: m.uom || '',
      agreedRate: String(m.agreedRate ?? ''),
      mrp: String(m.mrp ?? ''),
      priceTolerance: String(m.priceTolerance ?? 0.05)
    });
  }

  if (!ready) return null;

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">SKU Master</h1>

        <div className="card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">{editingId ? 'Edit SKU' : 'New SKU'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="ERP Code" value={form.skuErpCode} onChange={(v) => setForm({ ...form, skuErpCode: v })} />
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="EAN Code" value={form.eanCode} onChange={(v) => setForm({ ...form, eanCode: v })} />
            <Field label="HSN Code" value={form.hsnCode} onChange={(v) => setForm({ ...form, hsnCode: v })} />
            <Field label="UOM" value={form.uom} onChange={(v) => setForm({ ...form, uom: v })} />
            <Field label="Agreed Rate" value={form.agreedRate} onChange={(v) => setForm({ ...form, agreedRate: v })} />
            <Field label="MRP" value={form.mrp} onChange={(v) => setForm({ ...form, mrp: v })} />
            <Field
              label="Price Tolerance (fraction)"
              value={form.priceTolerance}
              onChange={(v) => setForm({ ...form, priceTolerance: v })}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                editingId ? updateMutation.mutate() : createMutation.mutate();
              }}
              className="px-4 py-2 text-sm rounded-md bg-brand-teal text-white font-medium"
            >
              {editingId ? 'Save Changes' : 'Create SKU'}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="px-4 py-2 text-sm rounded-md border border-slate-300"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left">ERP Code</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">EAN</th>
                <th className="px-3 py-2 text-left">HSN</th>
                <th className="px-3 py-2 text-left">UOM</th>
                <th className="px-3 py-2 text-right">Agreed Rate</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">Tolerance</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                    Loading…
                  </td>
                </tr>
              )}
              {Array.isArray(masters) &&
                masters.map((m: any) => (
                  <tr key={m._id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{m.skuErpCode}</td>
                    <td className="px-3 py-2">{m.name}</td>
                    <td className="px-3 py-2">{m.eanCode || '—'}</td>
                    <td className="px-3 py-2">{m.hsnCode || '—'}</td>
                    <td className="px-3 py-2">{m.uom || '—'}</td>
                    <td className="px-3 py-2 text-right">{m.agreedRate}</td>
                    <td className="px-3 py-2 text-right">{m.mrp}</td>
                    <td className="px-3 py-2 text-right">{m.priceTolerance}</td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button onClick={() => startEdit(m)} className="text-brand-teal text-xs font-medium">
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(m._id)}
                        className="text-rose-600 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
