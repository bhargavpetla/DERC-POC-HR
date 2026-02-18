const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Employee = require('../models/Employee');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeCode, password } = req.body;
    if (!employeeCode || !password) {
      return res.status(400).json({ message: 'Employee code and password are required' });
    }

    const user = await User.findOne({ employeeCode: employeeCode.toUpperCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, employeeCode: user.employeeCode, role: user.role, department: user.department },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        employeeCode: user.employeeCode,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        region: user.region,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const employee = await Employee.findOne({ employeeCode: req.user.employeeCode });
    res.json({
      user: {
        employeeCode: req.user.employeeCode,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        department: req.user.department,
        region: req.user.region,
      },
      employee,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
