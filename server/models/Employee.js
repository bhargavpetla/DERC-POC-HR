const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  dateOfBirth: { type: Date },
  department: { type: String, required: true },
  designation: { type: String, required: true },
  region: { type: String, required: true },
  legalEntity: { type: String, default: 'ARM Holding - CAPRI' },
  dateOfJoining: { type: Date, required: true },
  reportingManager: { type: String },
  employmentType: { type: String, enum: ['Full-Time', 'Part-Time', 'Contract', 'Intern'], default: 'Full-Time' },
  status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  salary: {
    basic: { type: Number },
    livingAllowance: { type: Number, default: 0 },
    mobileAllowance: { type: Number, default: 0 },
    gross: { type: Number },
    deductions: {
      pf: { type: Number },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number },
    },
    netPay: { type: Number },
  },
  leaveBalance: {
    annual: { type: Number, default: 30 },
    sick: { type: Number, default: 5 },
    compensatoryOff: { type: Number, default: 0 },
    total: { type: Number, default: 35 },
  },
  leaveHistory: [{
    type: { type: String },
    from: { type: Date },
    to: { type: Date },
    days: { type: Number },
    reason: { type: String },
    status: { type: String, enum: ['Approved', 'Pending', 'Rejected'], default: 'Approved' },
    appliedOn: { type: Date, default: Date.now },
  }],
  benefits: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
