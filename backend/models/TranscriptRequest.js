const mongoose = require('mongoose');

const transcriptRequestSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, required: true },
  numCopies: { type: Number, required: true, default: 1 },
  destination: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  remarks: { type: String },
  documentId: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('TranscriptRequest', transcriptRequestSchema);