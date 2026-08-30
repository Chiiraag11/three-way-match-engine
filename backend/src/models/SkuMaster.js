const mongoose = require('mongoose');

const SkuMasterSchema = new mongoose.Schema(
  {
    skuErpCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    eanCode: { type: String, trim: true, default: null, index: true },
    hsnCode: { type: String, trim: true, default: null },
    uom: { type: String, trim: true, default: null },
    agreedRate: { type: Number, default: 0 },
    mrp: { type: Number, default: 0 },
    priceTolerance: { type: Number, default: 0.05 } // fraction, e.g. 0.05 = 5%
  },
  { timestamps: true }
);

module.exports = mongoose.model('SkuMaster', SkuMasterSchema);
