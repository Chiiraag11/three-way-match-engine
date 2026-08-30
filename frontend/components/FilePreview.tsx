'use client';

import { useState } from 'react';
import { fileUrl } from '../lib/api';

export default function FilePreview({
  documentId,
  mimeType
}: {
  documentId: string | null;
  mimeType: string | null;
}) {
  const [zoom, setZoom] = useState(100);

  if (!documentId) {
    return (
      <div className="card h-full flex items-center justify-center text-sm text-slate-400 p-6">
        No file to preview
      </div>
    );
  }

  const src = fileUrl(documentId);
  const isImage = mimeType?.startsWith('image/');

  return (
    <div className="card h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <span className="text-xs font-medium text-slate-500">Original document</span>
        <div className="flex items-center gap-1 text-xs">
          <button
            className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-50"
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
          >
            −
          </button>
          <span className="w-10 text-center">{zoom}%</span>
          <button
            className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-50"
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-slate-50">
        {isImage ? (
          <img
            src={src}
            alt="document preview"
            style={{ width: `${zoom}%` }}
            className="mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <iframe
            src={src}
            title="document preview"
            style={{ width: `${zoom}%`, height: '100%', minHeight: 600, border: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
