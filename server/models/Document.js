const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'Offer Letter', 'Payslip', 'ID Proof', 'Address Proof', 'Education Certificate',
      'Experience Letter', 'Appointment Letter', 'Tax Document', 'Policy', 'Appraisal',
      'Contract', 'Custom'
    ],
    required: true,
  },
  customType: { type: String },
  department: { type: String },
  region: { type: String },
  taggedEmployees: [{ type: String }],
  taggedDepartments: [{ type: String }],
  tags: [{ type: String }],
  uploadedBy: { type: String },
  uploadDate: { type: Date, default: Date.now },
  fileUrl: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  accessLevel: { type: String, enum: ['employee', 'department', 'organization'], default: 'employee' },
  description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
