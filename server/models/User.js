const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  employeeCode: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['employee', 'manager', 'hr_head'], required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  department: { type: String },
  region: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
