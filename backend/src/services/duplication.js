const PurchaseOrder = require('../models/PurchaseOrder');
const Grn = require('../models/Grn');
const Invoice = require('../models/Invoice');

/**
 * Run AFTER a document has already been persisted. Checks whether it is a
 * duplicate and, if so, flags it (isDuplicate/duplicateReason) via an update -
 * the document is never overwritten or rejected, only annotated.
 */
async function checkDuplication(documentType, savedDoc) {
  if (documentType === 'po') {
    const existingCount = await PurchaseOrder.countDocuments({
      poNumber: savedDoc.poNumber,
      _id: { $ne: savedDoc._id }
    });
    if (existingCount > 0) {
      savedDoc.isDuplicate = true;
      savedDoc.duplicateReason = 'duplicate_po';
      await savedDoc.save();
      return { isDuplicate: true, reason: 'duplicate_po' };
    }
    return { isDuplicate: false, reason: null };
  }

  if (documentType === 'grn') {
    const existingCount = await Grn.countDocuments({
      poNumber: savedDoc.poNumber,
      grnNumber: savedDoc.grnNumber,
      _id: { $ne: savedDoc._id }
    });
    if (existingCount > 0) {
      savedDoc.isDuplicate = true;
      savedDoc.duplicateReason = 'duplicate_document';
      await savedDoc.save();
      return { isDuplicate: true, reason: 'duplicate_document' };
    }
    return { isDuplicate: false, reason: null };
  }

  if (documentType === 'invoice') {
    const existingCount = await Invoice.countDocuments({
      poNumber: savedDoc.poNumber,
      invoiceNumber: savedDoc.invoiceNumber,
      _id: { $ne: savedDoc._id }
    });
    if (existingCount > 0) {
      savedDoc.isDuplicate = true;
      savedDoc.duplicateReason = 'duplicate_document';
      await savedDoc.save();
      return { isDuplicate: true, reason: 'duplicate_document' };
    }
    return { isDuplicate: false, reason: null };
  }

  throw new Error(`Unsupported documentType for duplication check: ${documentType}`);
}

module.exports = { checkDuplication };
