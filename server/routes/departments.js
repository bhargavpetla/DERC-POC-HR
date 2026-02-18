const express = require('express');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/departments
router.get('/', authMiddleware, async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });
    const deptData = await Promise.all(
      departments.map(async (dept) => {
        const count = await Employee.countDocuments({ department: dept.name });
        return { ...dept.toObject(), employeeCount: count };
      })
    );
    res.json(deptData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
