'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthGuard } from '../lib/useAuthGuard';
import { listDocuments } from '../lib/queries';
import AppShell from '../components/AppShell';
import UploadModal from '../components/UploadModal';

export default function HomePage() {
  const ready = useAuthGuard();
  const [showUpload, setShowUpload] = useState(false);

  const { data: pos, isLoading } = useQuery({
    queryKey: ['documents', 'po'],
    queryFn: () => listDocuments({ type: 'po' }),
    enabled: ready
  });

  if (!ready) return null;

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Purchase Orders</h1>
            <p className="text-sm text-slate-500">Select a PO to view its three-way match, or upload a new document.</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-sm rounded-md bg-brand-teal text-white font-medium"
          >
            Upload Document
          </button>
        </div>

        {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

        {!isLoading && Array.isArray(pos) && pos.length === 0 && (
          <div className="card p-8 text-center text-slate-400">
            No purchase orders yet. Upload a PO, GRN, or Invoice to get started — documents can arrive in any order.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.isArray(pos) &&
            pos.map((po: any) => (
              <Link
                key={po._id}
                href={`/po/${encodeURIComponent(po.poNumber)}`}
                className="card p-4 hover:shadow-md transition-shadow"
              >
                <p className="text-xs text-slate-400 uppercase tracking-wide">PO Number</p>
                <p className="text-lg font-semibold text-slate-800">{po.poNumber}</p>
                <p className="text-sm text-slate-500 mt-1">{po.vendorName || 'Unknown vendor'}</p>
                {po.isDuplicate && (
                  <span className="badge bg-rose-100 text-rose-700 mt-2">duplicate PO</span>
                )}
              </Link>
            ))}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </AppShell>
  );
}
