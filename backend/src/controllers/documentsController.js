const path = require('path');
const PurchaseOrder = require('../models/PurchaseOrder');
const Grn = require('../models/Grn');
const Invoice = require('../models/Invoice');
const MatchAudit = require('../models/MatchAudit');
const { extractDocument } = require('../services/gemini');
const { resolveItemsAgainstMaster } = require('../services/masterResolution');
const { checkDuplication } = require('../services/duplication');

const MODEL_BY_TYPE = { po: PurchaseOrder, grn: Grn, invoice: Invoice };
const NUMBER_FIELD_BY_TYPE = { po: 'poNumber', grn: 'grnNumber', invoice: 'invoiceNumber' };
const DATE_FIELD_BY_TYPE = { po: 'poDate', grn: 'grnDate', invoice: 'invoiceDate' };

async function addAuditStep(poNumber, step, status, message) {
  if (!poNumber) return;
  await MatchAudit.findOneAndUpdate(
    { poNumber },
    { $push: { steps: { step, status, message, at: new Date() } } },
    { upsert: true }
  );
}

function safeParseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function uploadDocument(req, res) {
  const { documentType } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded. Attach a "file" field.' });
  }
  if (!['po', 'grn', 'invoice'].includes(documentType)) {
    return res.status(400).json({ error: 'documentType must be one of: po, grn, invoice' });
  }

  let extraction;
  try {
    extraction = await extractDocument(documentType, file.path, file.mimetype);
  } catch (err) {
    await addAuditStep(null, 'parse', 'error', err.message);
    return res.status(422).json({ error: `Document parsing failed: ${err.message}` });
  }

  const parsed = extraction.parsed;
  const numberField = NUMBER_FIELD_BY_TYPE[documentType];
  const poNumber = documentType === 'po' ? parsed.poNumber : parsed.poNumber;

  if (!parsed[numberField] || !parsed.poNumber) {
    await addAuditStep(poNumber || 'UNKNOWN', 'parse', 'error', `Missing ${numberField} or poNumber in extracted data`);
    return res.status(422).json({ error: `Extracted data is missing required field "${numberField}" or "poNumber"` });
  }

  await addAuditStep(parsed.poNumber, 'parse', 'ok', `Parsed ${documentType} via Gemini`);

  // Master resolution (before persistence) - never blocks storage.
  try {
    await resolveItemsAgainstMaster(parsed.items);
    const unmapped = parsed.items.filter((i) => i.unmappedMasterSku).length;
    await addAuditStep(
      parsed.poNumber,
      'master_resolution',
      unmapped > 0 ? 'warning' : 'ok',
      unmapped > 0 ? `${unmapped} item(s) could not be resolved to a SkuMaster record` : 'All items resolved'
    );
  } catch (err) {
    await addAuditStep(parsed.poNumber, 'master_resolution', 'error', err.message);
    // Do not block persistence - continue with unresolved items.
  }

  const Model = MODEL_BY_TYPE[documentType];
  const doc = new Model({
    ...parsed,
    [DATE_FIELD_BY_TYPE[documentType]]: safeParseDate(parsed[DATE_FIELD_BY_TYPE[documentType]]),
    rawParsed: extraction.raw,
    filePath: path.relative(path.join(__dirname, '..', '..'), file.path),
    fileMimeType: file.mimetype
  });

  try {
    await doc.save();
  } catch (err) {
    await addAuditStep(parsed.poNumber, 'persist', 'error', err.message);
    return res.status(500).json({ error: `Failed to persist document: ${err.message}` });
  }
  await addAuditStep(parsed.poNumber, 'persist', 'ok', `${documentType} ${doc[numberField]} stored (id ${doc._id})`);

  let duplication;
  try {
    duplication = await checkDuplication(documentType, doc);
    await addAuditStep(
      parsed.poNumber,
      'duplication_check',
      duplication.isDuplicate ? 'warning' : 'ok',
      duplication.isDuplicate ? `Flagged as ${duplication.reason}` : 'No duplicate found'
    );
  } catch (err) {
    await addAuditStep(parsed.poNumber, 'duplication_check', 'error', err.message);
  }

  res.status(201).json({ documentType, document: doc, duplication });
}

async function getDocument(req, res) {
  const { id } = req.params;
  for (const [type, Model] of Object.entries(MODEL_BY_TYPE)) {
    const found = await Model.findById(id).populate('items.skuMaster');
    if (found) return res.json({ documentType: type, document: found });
  }
  res.status(404).json({ error: 'Document not found' });
}

async function getDocumentFile(req, res) {
  const { id } = req.params;
  for (const Model of Object.values(MODEL_BY_TYPE)) {
    const found = await Model.findById(id).lean();
    if (found) {
      if (!found.filePath) return res.status(404).json({ error: 'No file associated with this document' });
      const absolutePath = path.join(__dirname, '..', '..', found.filePath);
      return res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) res.status(404).json({ error: 'File not found on disk' });
      });
    }
  }
  res.status(404).json({ error: 'Document not found' });
}

async function listDocuments(req, res) {
  const { type, poNumber } = req.query;
  const filter = {};
  if (poNumber) filter.poNumber = poNumber;

  const types = type ? [type] : ['po', 'grn', 'invoice'];
  for (const t of types) {
    if (!MODEL_BY_TYPE[t]) return res.status(400).json({ error: `Invalid type: ${t}` });
  }

  const results = {};
  for (const t of types) {
    results[t] = await MODEL_BY_TYPE[t].find(filter).sort({ createdAt: -1 }).lean();
  }

  res.json(type ? results[type] : results);
}

module.exports = { uploadDocument, getDocument, getDocumentFile, listDocuments };
