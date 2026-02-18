const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  managerId: { type: String, required: true },
  managerName: { type: String },
  region: { type: String, required: true },
  legalEntity: { type: String, default: 'NETSCIENCE India Pvt Ltd' },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
