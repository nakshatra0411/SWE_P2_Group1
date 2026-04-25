const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['Pending Department', 'Pending Admin', 'Approved', 'Rejected'], default: 'Pending Department' },
  downloadUrl: { type: String },
  remarks: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', certificateSchema);