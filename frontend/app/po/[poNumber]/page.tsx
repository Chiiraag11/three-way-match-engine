'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthGuard } from '../../../lib/useAuthGuard';
import { getMatch, getSummary, listDocuments, getDocument } from '../../../lib/queries';
import AppShell from '../../../components/AppShell';
import TopTabs, { TopTabKey } from '../../../components/TopTabs';
import SubTabPills from '../../../components/SubTabPills';
import DocumentForm from '../../../components/DocumentForm';
import FilePreview from '../../../components/FilePreview';
import ItemGrid from '../../../components/ItemGrid';
import SummaryTab from '../../../components/SummaryTab';
import StatusBadge from '../../../components/StatusBadge';
import UploadModal from '../../../components/UploadModal';

function fmtDate(d: string | null | undefined) {
  if (!d) return '—';
  const date = new Date(d);
  return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString('en-IN');
}

export default function PoDetailPage() {
  const ready = useAuthGuard();
  const params = useParams<{ poNumber: string }>();
  const poNumber = decodeURIComponent(params.poNumber);

  const [activeTab, setActiveTab] = useState<TopTabKey>('po');
  const [activeGrnId, setActiveGrnId] = useState<string | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const matchQuery = useQuery({
    queryKey: ['match', poNumber],
    queryFn: () => getMatch(poNumber),
    enabled: ready
  });

  const docsQuery = useQuery({
    queryKey: ['documents', 'byPo', poNumber],
    queryFn: () => listDocuments({ poNumber }),
    enabled: ready
  });

  const summaryQuery = useQuery({
    queryKey: ['summary', poNumber],
    queryFn: () => getSummary(poNumber),
    enabled: ready && activeTab === 'summary'
  });

  const grns = docsQuery.data?.grn || [];
  const invoices = docsQuery.data?.invoice || [];
  const po = docsQuery.data?.po?.[0] || null;

useEffect(() => {
  const activeGrns = grns.filter((g: any) => !g.isDuplicate);

  if (!activeGrnId && activeGrns.length > 0) {
    setActiveGrnId(activeGrns[0]._id);
  }
}, [grns, activeGrnId]);

  useEffect(() => {
    if (!activeInvoiceId && invoices.length > 0) setActiveInvoiceId(invoices[0]._id);
  }, [invoices, activeInvoiceId]);

const activeGrn = useMemo(
  () => grns.find((g: any) => g._id === activeGrnId && !g.isDuplicate) || null,
  [grns, activeGrnId]
);
const activeInvoice = useMemo(
  () => invoices.find((i: any) => i._id === activeInvoiceId) || null,
  [invoices, activeInvoiceId]
);

  const match = matchQuery.data;
  const items = match?.items || [];

  if (!ready) return null;

  return (
    <AppShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 pt-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">{poNumber}</h1>
            {match && <StatusBadge status={match.status} />}
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 text-sm rounded-md bg-brand-teal text-white font-medium"
          >
            Upload Document
          </button>
        </div>

       <TopTabs
  active={activeTab}
  onChange={setActiveTab}
  invoiceCount={invoices.length}
  grnCount={grns.filter((g: any) => !g.isDuplicate).length}
/>

        {activeTab === 'po' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <DocumentForm
                title="Purchase Order Details"
                status={match?.status}
                bannerText={
                  match?.reasons?.length
                    ? `Mismatch: ${match.reasons.map((r: string) => r.replaceAll('_', ' ')).join(', ')}`
                    : null
                }
                fields={[
                  { label: 'PO Number', value: poNumber },
                  { label: 'PO Date', value: fmtDate(po?.poDate) },
                  { label: 'Vendor', value: po?.vendorName || '' },
                  { label: 'Item Count', value: String(po?.items?.length || 0) }
                ]}
              />
            </div>
            <FilePreview documentId={po?._id || null} mimeType={po?.fileMimeType || null} />
            <div className="lg:col-span-2">
              <ItemGrid items={items} />
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="flex-1 flex flex-col">
            <SubTabPills
  items={grns
    .filter((g: any) => !g.isDuplicate)
    .map((g: any) => ({
      id: g._id,
      label: `GRN: ${g.grnNumber}`,
      isDuplicate: false
    }))}
  activeId={activeGrnId}
  onChange={setActiveGrnId}
/>
            {activeGrn && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentForm
                  title="GRN Details"
                  bannerText={activeGrn.isDuplicate ? 'Duplicate GRN number for this PO' : null}
                  fields={[
                    { label: 'GRN Number', value: activeGrn.grnNumber },
                    { label: 'PO Number', value: activeGrn.poNumber },
                    { label: 'GRN Date', value: fmtDate(activeGrn.grnDate) },
                    { label: 'Item Count', value: String(activeGrn.items?.length || 0) }
                  ]}
                />
                <FilePreview documentId={activeGrn._id} mimeType={activeGrn.fileMimeType} />
                <div className="lg:col-span-2">
                  <ItemGrid items={items} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fulfillment' && (
          <div className="flex-1 flex flex-col">
            <SubTabPills
              items={invoices.map((i: any) => ({
                id: i._id,
                label: `Invoice: ${i.invoiceNumber}`,
                isDuplicate: i.isDuplicate
              }))}
              activeId={activeInvoiceId}
              onChange={setActiveInvoiceId}
            />
            {activeInvoice && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentForm
                  title="Invoice Details"
                  bannerText={activeInvoice.isDuplicate ? 'Duplicate invoice number for this PO' : null}
                  fields={[
                    { label: 'Invoice Number', value: activeInvoice.invoiceNumber },
                    { label: 'PO Number', value: activeInvoice.poNumber },
                    { label: 'Invoice Date', value: fmtDate(activeInvoice.invoiceDate) },
                    { label: 'Item Count', value: String(activeInvoice.items?.length || 0) }
                  ]}
                />
                <FilePreview documentId={activeInvoice._id} mimeType={activeInvoice.fileMimeType} />
                <div className="lg:col-span-2">
                  <ItemGrid items={items} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'summary' && summaryQuery.data && <SummaryTab summary={summaryQuery.data} />}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </AppShell>
  );
}
