const express = require('express');
const router = express.Router();
const SkuMaster = require('../models/SkuMaster');

function validatePayload(body, { partial } = {}) {
  const errors = [];
  const required = ['skuErpCode', 'name'];
  if (!partial) {
    for (const field of required) {
      if (!body[field] || String(body[field]).trim() === '') errors.push(`${field} is required`);
    }
  }
  const numericFields = ['agreedRate', 'mrp', 'priceTolerance'];
  for (const field of numericFields) {
    if (body[field] !== undefined && body[field] !== null && isNaN(Number(body[field]))) {
      errors.push(`${field} must be a number`);
    }
  }
  return errors;
}

router.get('/', async (req, res) => {
  const items = await SkuMaster.find({}).sort({ createdAt: -1 });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await SkuMaster.findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'SkuMaster not found' });
  res.json(item);
});

router.post('/', async (req, res) => {
  const errors = validatePayload(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

  try {
    const created = await SkuMaster.create({
      skuErpCode: String(req.body.skuErpCode).trim(),
      name: String(req.body.name).trim(),
      eanCode: req.body.eanCode ? String(req.body.eanCode).trim() : null,
      hsnCode: req.body.hsnCode ? String(req.body.hsnCode).trim() : null,
      uom: req.body.uom ? String(req.body.uom).trim() : null,
      agreedRate: req.body.agreedRate !== undefined ? Number(req.body.agreedRate) : 0,
      mrp: req.body.mrp !== undefined ? Number(req.body.mrp) : 0,
      priceTolerance: req.body.priceTolerance !== undefined ? Number(req.body.priceTolerance) : 0.05
    });
    res.status(201).json(created);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A SkuMaster with this skuErpCode already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  const errors = validatePayload(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });

  try {
    const updates = { ...req.body };
    for (const f of ['agreedRate', 'mrp', 'priceTolerance']) {
      if (updates[f] !== undefined) updates[f] = Number(updates[f]);
    }
    const updated = await SkuMaster.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ error: 'SkuMaster not found' });
    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'A SkuMaster with this skuErpCode already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const deleted = await SkuMaster.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'SkuMaster not found' });
  res.status(204).send();
});

module.exports = router;
