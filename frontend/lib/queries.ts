import { apiFetch } from './api';

export type DocumentType = 'po' | 'grn' | 'invoice';

export async function login(username: string, password: string) {
  return apiFetch<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function uploadDocument(file: File, documentType: DocumentType) {
  const form = new FormData();
  form.append('file', file);
  form.append('documentType', documentType);
  return apiFetch('/documents/upload', { method: 'POST', body: form, isForm: true });
}

export async function listDocuments(params: { type?: DocumentType; poNumber?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.type) qs.set('type', params.type);
  if (params.poNumber) qs.set('poNumber', params.poNumber);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/documents${suffix}`);
}

export async function getDocument(id: string) {
  return apiFetch(`/documents/${id}`);
}

export async function getMatch(poNumber: string) {
  return apiFetch(`/match/${encodeURIComponent(poNumber)}`);
}

export async function getSummary(poNumber: string) {
  return apiFetch(`/summary/${encodeURIComponent(poNumber)}`);
}

export async function listSkuMasters() {
  return apiFetch('/masters/sku');
}

export async function createSkuMaster(payload: Record<string, unknown>) {
  return apiFetch('/masters/sku', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateSkuMaster(id: string, payload: Record<string, unknown>) {
  return apiFetch(`/masters/sku/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function deleteSkuMaster(id: string) {
  return apiFetch(`/masters/sku/${id}`, { method: 'DELETE' });
}
