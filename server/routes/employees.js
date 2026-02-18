const express = require('express');
const Employee = require('../models/Employee');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const { rbacMiddleware, hrOnly } = require('../middleware/rbac');

const router = express.Router();

// GET /api/employees
router.get('/', authMiddleware, rbacMiddleware, async (req, res) => {
  try {
    let filter = {};
    const { department, region, status, search, employmentType, sortBy, sortOrder } = req.query;

    if (req.accessScope === 'self') {
      filter.employeeCode = req.accessEmployeeCode;
    } else if (req.accessScope === 'department') {
      filter.department = req.accessDepartment;
    }

    if (department && req.accessScope === 'all') filter.department = department;
    if (region) filter.region = region;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchFilter = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { employeeCode: searchRegex },
        { designation: searchRegex },
        { email: searchRegex },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    // Dynamic sorting
    const sortField = sortBy || 'employeeCode';
    const sortDir = sortOrder === 'desc' ? -1 : 1;

    const [employees, total] = await Promise.all([
      Employee.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit),
      Employee.countDocuments(filter),
    ]);

    res.json({ employees, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/employees/:code
router.get('/:code', authMiddleware, rbacMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeCode: req.params.code.toUpperCase() });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (req.accessScope === 'self' && employee.employeeCode !== req.accessEmployeeCode) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (req.accessScope === 'department' && employee.department !== req.accessDepartment) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/employees
router.post('/', authMiddleware, hrOnly, async (req, res) => {
  try {
    const lastEmp = await Employee.findOne({}).sort({ employeeCode: -1 });
    let nextCode = '11198';
    if (lastEmp) {
      const num = parseInt(lastEmp.employeeCode) + 1;
      nextCode = String(num);
    }

    const employeeData = { ...req.body, employeeCode: nextCode };
    const employee = await Employee.create(employeeData);

    // Create user account
    const hashedPassword = await bcrypt.hash('nsoffice123', 10);
    await User.create({
      employeeCode: nextCode,
      password: hashedPassword,
      role: 'employee',
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      department: req.body.department,
      region: req.body.region,
    });

    res.status(201).json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/employees/:code
router.put('/:code', authMiddleware, hrOnly, async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { employeeCode: req.params.code.toUpperCase() },
      req.body,
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
