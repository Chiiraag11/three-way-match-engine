const mongoose = require('mongoose');
const { Schema } = mongoose;

const GrnItemSchema = new Schema(
  {
    itemCode: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    receivedQuantity: { type: Number, default: 0 },
    mrp: { type: Number, default: null },
    skuMaster: { type: Schema.Types.ObjectId, ref: 'SkuMaster', default: null },
    unmappedMasterSku: { type: Boolean, default: false }
  },
  { _id: false }
);

const GrnSchema = new Schema(
  {
    // grnNumber is unique *per poNumber* by business rule, not globally unique in
    // the DB (see duplication.js) - a repeat is stored and flagged, not rejected.
    grnNumber: { type: String, required: true, trim: true, index: true },
    poNumber: { type: String, required: true, trim: true, index: true },
    grnDate: { type: Date, default: null },
    items: { type: [GrnItemSchema], default: [] },
    rawParsed: { type: Schema.Types.Mixed, default: null },
    filePath: { type: String, default: null },
    fileMimeType: { type: String, default: null },
    isDuplicate: { type: Boolean, default: false },
    duplicateReason: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Grn', GrnSchema);
