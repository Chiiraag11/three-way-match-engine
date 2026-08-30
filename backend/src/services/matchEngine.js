const PurchaseOrder = require('../models/PurchaseOrder');
const Grn = require('../models/Grn');
const Invoice = require('../models/Invoice');
const SkuMaster = require('../models/SkuMaster');
const { normalise } = require('./masterResolution');

const HARD_REASONS = new Set([
  'grn_qty_exceeds_po_qty',
  'invoice_qty_exceeds_grn_qty',
  'invoice_qty_exceeds_po_qty',
  'invoice_date_after_po_date',
  'duplicate_po',
  'duplicate_document',
  'item_missing_in_po'
]);

const SOFT_REASONS = new Set(['price_mismatch', 'mrp_mismatch', 'unmapped_master_sku']);

function itemKey(item) {
  // Match documents using the actual ERP/item code whenever available.
  // This prevents an unresolved PO item from becoming a different key
  // from a resolved GRN/invoice item for the same product.
  const code = normalise(item.itemCode);

  if (code) {
    return `code:${code}`;
  }

  // Fallback only when the document does not contain an item code.
  if (item.skuMaster) {
    return `sku:${item.skuMaster.toString()}`;
  }

  return 'unknown';
}

function within(pct, tolerance) {
  return Math.abs(pct) <= tolerance;
}

/**
 * Recomputes the full three-way match result for a poNumber from whatever is
 * currently in the database. Never reads/returns a cached result.
 */
async function computeMatch(poNumber) {
  const [pos, grns, invoices] = await Promise.all([
    PurchaseOrder.find({ poNumber }).sort({ createdAt: 1 }).lean(),
    Grn.find({ poNumber }).sort({ createdAt: 1 }).lean(),
    Invoice.find({ poNumber }).sort({ createdAt: 1 }).lean()
  ]);

  const reasons = []; // PO-level reason codes (deduped)
  const addReason = (code) => {
    if (!reasons.includes(code)) reasons.push(code);
  };

  const primaryPo = pos[0] || null;
  if (pos.length > 1) addReason('duplicate_po');

  const activeGrns = grns.filter((g) => !g.isDuplicate);
  const activeInvoices = invoices.filter((inv) => !inv.isDuplicate);
  if (grns.some((g) => g.isDuplicate) || invoices.some((i) => i.isDuplicate)) {
    addReason('duplicate_document');
  }

  const hasPO = !!primaryPo;
  const hasGRN = grns.length > 0;
  const hasInvoice = invoices.length > 0;

  // Invoice date after PO date
  if (hasPO && primaryPo.poDate) {
    for (const inv of activeInvoices) {
      if (inv.invoiceDate && new Date(inv.invoiceDate) > new Date(primaryPo.poDate)) {
        addReason('invoice_date_after_po_date');
        break;
      }
    }
  }

  // ---- Build per-item aggregates keyed by resolved SKU (or raw code) ----
  const items = new Map(); // key -> aggregate

  function ensure(key, sampleItem) {
    if (!items.has(key)) {
      items.set(key, {
        key,
        skuMasterId: sampleItem.skuMaster ? sampleItem.skuMaster.toString() : null,
        itemCode: sampleItem.itemCode || '',
        description: sampleItem.description || '',
        unmappedMasterSku: false,
        poQty: 0,
        inPo: false,
        grnQty: 0,
        invoiceQty: 0,
        grnMrp: null,
        invoiceUnitRate: null,
        invoiceMrp: null
      });
    }
    return items.get(key);
  }

  if (hasPO) {
    for (const it of primaryPo.items || []) {
      const key = itemKey(it);
      const agg = ensure(key, it);
      agg.poQty += Number(it.quantity) || 0;
      agg.inPo = true;
      if (it.unmappedMasterSku) agg.unmappedMasterSku = true;
      if (!agg.description && it.description) agg.description = it.description;
    }
  }

  for (const grn of activeGrns) {
    for (const it of grn.items || []) {
      const key = itemKey(it);
      const agg = ensure(key, it);
      agg.grnQty += Number(it.receivedQuantity) || 0;
      if (it.mrp !== null && it.mrp !== undefined && it.mrp !== 0) agg.grnMrp = it.mrp;
      if (it.unmappedMasterSku) agg.unmappedMasterSku = true;
      if (!agg.description && it.description) agg.description = it.description;
    }
  }

  for (const inv of activeInvoices) {
    for (const it of inv.items || []) {
      const key = itemKey(it);
      const agg = ensure(key, it);
      agg.invoiceQty += Number(it.quantity) || 0;
      if (it.unitRate !== null && it.unitRate !== undefined && it.unitRate !== 0) agg.invoiceUnitRate = it.unitRate;
      if (it.mrp !== null && it.mrp !== undefined && it.mrp !== 0) agg.invoiceMrp = it.mrp;
      if (it.unmappedMasterSku) agg.unmappedMasterSku = true;
      if (!agg.description && it.description) agg.description = it.description;
    }
  }

  // Attach SkuMaster details in bulk
  const skuIds = [...items.values()].map((i) => i.skuMasterId).filter(Boolean);
  const masters = skuIds.length ? await SkuMaster.find({ _id: { $in: skuIds } }).lean() : [];
  const masterById = new Map(masters.map((m) => [m._id.toString(), m]));

  let anyHard = false;
  let anySoft = false;
  let anyUnreconciled = false;

  const itemResults = [];
  for (const agg of items.values()) {
    const itemReasons = [];
    const master = agg.skuMasterId ? masterById.get(agg.skuMasterId) : null;

    if (!agg.inPo) {
      itemReasons.push('item_missing_in_po');
    }

    if (agg.inPo && agg.grnQty > agg.poQty) itemReasons.push('grn_qty_exceeds_po_qty');
    if (agg.grnQty > 0 && agg.invoiceQty > agg.grnQty) itemReasons.push('invoice_qty_exceeds_grn_qty');
    if (agg.inPo && agg.invoiceQty > agg.poQty) itemReasons.push('invoice_qty_exceeds_po_qty');

    if (agg.unmappedMasterSku || !master) itemReasons.push('unmapped_master_sku');

    if (master && agg.invoiceUnitRate !== null && master.agreedRate) {
      const diffPct = (agg.invoiceUnitRate - master.agreedRate) / master.agreedRate;
      const tolerance = master.priceTolerance ?? 0.05;
      if (!within(diffPct, tolerance)) itemReasons.push('price_mismatch');
    }

    if (master && master.mrp) {
      const observedMrp = agg.invoiceMrp ?? agg.grnMrp;
      if (observedMrp !== null && observedMrp !== undefined) {
        const diffPct = (observedMrp - master.mrp) / master.mrp;
        if (!within(diffPct, 0.01)) itemReasons.push('mrp_mismatch');
      }
    }

    const fullyReconciled =
      agg.inPo && agg.poQty === agg.grnQty && agg.grnQty === agg.invoiceQty && itemReasons.length === 0;

    for (const r of itemReasons) {
      if (HARD_REASONS.has(r)) anyHard = true;
      if (SOFT_REASONS.has(r)) anySoft = true;
    }
    if (!fullyReconciled) anyUnreconciled = true;

    itemResults.push({
      skuMasterId: agg.skuMasterId,
      skuMasterName: master ? master.name : null,
      erpCode: master ? master.skuErpCode : agg.itemCode,
      eanCode: master ? master.eanCode : null,
      hsnCode: master ? master.hsnCode : null,
      uom: master ? master.uom : null,
      itemCode: agg.itemCode,
      description: agg.description,
      poQty: agg.poQty,
      grnQty: agg.grnQty,
      invoiceQty: agg.invoiceQty,
      pendingDeliveryQty: Math.max(agg.poQty - agg.grnQty, 0),
      pendingInvoiceQty: Math.max(agg.grnQty - agg.invoiceQty, 0),
      unitRate: agg.invoiceUnitRate,
      agreedRate: master ? master.agreedRate : null,
      mrp: agg.invoiceMrp ?? agg.grnMrp,
      masterMrp: master ? master.mrp : null,
      grossAmount:
        agg.invoiceUnitRate !== null && agg.invoiceQty
          ? Number((agg.invoiceUnitRate * agg.invoiceQty).toFixed(2))
          : null,
      reasons: itemReasons,
      fullyReconciled
    });
  }

  for (const code of new Set(itemResults.flatMap((i) => i.reasons))) addReason(code);

  let status;
  if (!hasPO || !hasGRN || !hasInvoice) {
    status = 'insufficient_documents';
  } else if (anyHard || reasons.some((r) => HARD_REASONS.has(r))) {
    status = 'mismatch';
  } else if (anySoft || anyUnreconciled || reasons.some((r) => SOFT_REASONS.has(r))) {
    status = 'partially_matched';
  } else {
    status = 'matched';
  }

  return {
    poNumber,
    status,
    reasons,
    documents: {
      po: primaryPo ? { id: primaryPo._id, poDate: primaryPo.poDate, vendorName: primaryPo.vendorName } : null,
      allPos: pos.map((p) => ({ id: p._id, isDuplicate: p.isDuplicate })),
      grns: grns.map((g) => ({ id: g._id, grnNumber: g.grnNumber, isDuplicate: g.isDuplicate })),
      invoices: invoices.map((i) => ({ id: i._id, invoiceNumber: i.invoiceNumber, isDuplicate: i.isDuplicate }))
    },
    items: itemResults,
    computedAt: new Date().toISOString()
  };
}

module.exports = { computeMatch, HARD_REASONS, SOFT_REASONS };
