const SkuMaster = require('../models/SkuMaster');

function normalise(code) {
  if (code === null || code === undefined) return '';
  return String(code).trim().toLowerCase();
}

/**
 * Mutates `items` in place, attaching `skuMaster` (ObjectId) when a match is
 * found by skuErpCode, falling back to eanCode. If neither matches, leaves
 * skuMaster unset and marks unmappedMasterSku = true (soft warning - the item
 * is never dropped).
 */
async function resolveItemsAgainstMaster(items) {
  if (!Array.isArray(items) || items.length === 0) return items;

  const allMasters = await SkuMaster.find({}).lean();

  const byErpCode = new Map();
  const byEanCode = new Map();
  for (const m of allMasters) {
    if (m.skuErpCode) byErpCode.set(normalise(m.skuErpCode), m);
    if (m.eanCode) byEanCode.set(normalise(m.eanCode), m);
  }

  for (const item of items) {
    const code = normalise(item.itemCode);
    let match = code ? byErpCode.get(code) : null;
    if (!match && code) match = byEanCode.get(code);

    if (match) {
      item.skuMaster = match._id;
      item.unmappedMasterSku = false;
    } else {
      item.skuMaster = null;
      item.unmappedMasterSku = true;
    }
  }

  return items;
}

module.exports = { resolveItemsAgainstMaster, normalise };
