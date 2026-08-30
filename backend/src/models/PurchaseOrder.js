const mongoose = require('mongoose');
const { Schema } = mongoose;

const PoItemSchema = new Schema(
  {
    itemCode: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0 },
    skuMaster: { type: Schema.Types.ObjectId, ref: 'SkuMaster', default: null },
    unmappedMasterSku: { type: Boolean, default: false }
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema(
  {
    // NOTE: poNumber is intentionally NOT unique at the DB level. Business rule
    // requires a second PO for the same poNumber to still be stored (never
    // overwritten) and instead be flagged via isDuplicate/duplicateReason so the
    // conflict is surfaced by the match engine as `duplicate_po`.
    poNumber: { type: String, required: true, trim: true, index: true },
    poDate: { type: Date, default: null },
    vendorName: { type: String, trim: true, default: '' },
    items: { type: [PoItemSchema], default: [] },
    rawParsed: { type: Schema.Types.Mixed, default: null },
    filePath: { type: String, default: null },
    fileMimeType: { type: String, default: null },
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
module.exports.PoItemSchema = PoItemSchema;
