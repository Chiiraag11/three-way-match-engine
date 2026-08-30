const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditStepSchema = new Schema(
  {
    step: { type: String, required: true }, // e.g. 'parse', 'master_resolution', 'duplication_check', 'persist'
    status: { type: String, required: true }, // 'ok' | 'warning' | 'error'
    message: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const MatchAuditSchema = new Schema(
  {
    poNumber: { type: String, required: true, index: true },
    steps: { type: [AuditStepSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('MatchAudit', MatchAuditSchema);
