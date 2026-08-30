const mongoose = require('mongoose');
const { Schema } = mongoose;

const InvoiceItemSchema = new Schema(
  {
    itemCode: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 0 },
    unitRate: { type: Number, default: null },
    mrp: { type: Number, default: null },
    skuMaster: { type: Schema.Types.ObjectId, ref: 'SkuMaster', default: null },
    unmappedMasterSku: { type: Boolean, default: false }
  },
  { _id: false }
);

const InvoiceSchema = new Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true, index: true },
    poNumber: { type: String, required: true, trim: true, index: true },
    invoiceDate: { type: Date, default: null },
    items: { type: [InvoiceItemSchema], default: [] },
    rawParsed: { type: Schema.Types.Mixed, default: null },
    filePath: { type: String, default: null },
    fileMimeType: { type: String, default: null },
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', InvoiceSchema);
