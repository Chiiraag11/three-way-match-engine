'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadDocument, DocumentType } from '../lib/queries';
import { ApiError } from '../lib/api';

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const [documentType, setDocumentType] = useState<DocumentType>('po');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a file first');
      return uploadDocument(file, documentType);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['match'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Upload failed');
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Upload Document</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">Document Type</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          >
            <option value="po">Purchase Order</option>
            <option value="grn">GRN (Delivery)</option>
            <option value="invoice">Invoice (Fulfillment)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-600">File (PDF or image)</label>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {mutation.isPending && <p className="text-sm text-slate-500">Uploading and parsing… this can take a few seconds.</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-slate-300">
            Cancel
          </button>
          <button
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
            disabled={!file || mutation.isPending}
            className="px-4 py-2 text-sm rounded-md bg-brand-teal text-white disabled:opacity-60"
          >
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}
