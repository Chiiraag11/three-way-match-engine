const PurchaseOrder = require('../models/PurchaseOrder');
const Grn = require('../models/Grn');
const Invoice = require('../models/Invoice');
const { computeMatch } = require('./matchEngine');

function lineTotal(item, qtyField, rateField) {
  const qty = Number(item[qtyField]) || 0;
  const rate = Number(item[rateField]) || 0;
  return qty * rate;
}

async function computeSummary(poNumber) {
  const [po, grns, invoices, match] = await Promise.all([
    PurchaseOrder.findOne({ poNumber }).sort({ createdAt: 1 }).lean(),
    Grn.find({ poNumber }).sort({ createdAt: 1 }).lean(),
    Invoice.find({ poNumber }).sort({ createdAt: 1 }).lean(),
    computeMatch(poNumber)
  ]);

  // NOTE: the PO document itself only carries quantity (no unit price is part
  // of the minimum required PO extraction fields). We estimate "PO Amount" as
  // poQty * SkuMaster.agreedRate per resolved item - documented assumption,
  // see README. Unresolved items contribute 0 to this estimate.
  const poAmount = match.items.reduce((sum, it) => {
    const rate = it.agreedRate || 0;
    return sum + it.poQty * rate;
  }, 0);

  const totalInvoicedAmount = invoices
    .filter((i) => !i.isDuplicate)
    .reduce((sum, inv) => sum + (inv.items || []).reduce((s, it) => s + lineTotal(it, 'quantity', 'unitRate'), 0), 0);

  const totalReceivedQty = grns
    .filter((g) => !g.isDuplicate)
    .reduce((sum, g) => sum + (g.items || []).reduce((s, it) => s + (Number(it.receivedQuantity) || 0), 0), 0);

  const poQtyTotal = po ? (po.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;

  const rows = [];

  for (const g of grns) {
    const qty = (g.items || []).reduce((s, it) => s + (Number(it.receivedQuantity) || 0), 0);
    rows.push({
      type: 'GRN',
      documentNumber: g.grnNumber,
      date: g.grnDate,
      quantity: qty,
      amount: null,
      isDuplicate: g.isDuplicate
    });
  }

  for (const inv of invoices) {
    const qty = (inv.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    const amount = (inv.items || []).reduce((s, it) => s + lineTotal(it, 'quantity', 'unitRate'), 0);
    rows.push({
      type: 'Invoice',
      documentNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      quantity: qty,
      amount: Number(amount.toFixed(2)),
      isDuplicate: inv.isDuplicate
    });
  }

  rows.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const cumulativeInvoicedQty = invoices
    .filter((i) => !i.isDuplicate)
    .reduce((s, inv) => s + (inv.items || []).reduce((s2, it) => s2 + (Number(it.quantity) || 0), 0), 0);

  rows.push({
    type: 'Current Status',
    documentNumber: match.status,
    date: match.computedAt,
    quantity: cumulativeInvoicedQty,
    amount: Number(totalInvoicedAmount.toFixed(2)),
    isDuplicate: false,
    isSummaryRow: true
  });

  return {
    poNumber,
    stats: {
      poAmount: Number(poAmount.toFixed(2)),
      totalInvoiced: Number(totalInvoicedAmount.toFixed(2)),
      totalReceived: totalReceivedQty
    },
    pendingDeliveryQty: Math.max(poQtyTotal - totalReceivedQty, 0),
    pendingInvoiceQty: Math.max(totalReceivedQty - cumulativeInvoicedQty, 0),
    status: match.status,
    rows
  };
}

module.exports = { computeSummary };
