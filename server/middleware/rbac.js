const rbacMiddleware = (req, res, next) => {
  const { role, employeeCode, department } = req.user;

  if (role === 'hr_head') {
    req.accessScope = 'all';
  } else if (role === 'manager') {
    req.accessScope = 'department';
    req.accessDepartment = department;
  } else {
    req.accessScope = 'self';
    req.accessEmployeeCode = employeeCode;
  }
  next();
};

const hrOnly = (req, res, next) => {
  if (req.user.role !== 'hr_head') {
    return res.status(403).json({ message: 'Access denied. HR Head only.' });
  }
  next();
};

module.exports = { rbacMiddleware, hrOnly };
