require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Document = require('../models/Document');
const Department = require('../models/Department');
const ChatHistory = require('../models/ChatHistory');

const DOCS_DIR = path.join(__dirname, '..', 'documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

const PASSWORD = 'nsoffice123';

// ──────────────────────────────────────────────
// DEPARTMENTS (from client Excel)
// ──────────────────────────────────────────────
const departments = [
  { name: 'Administration', managerId: '11177', managerName: 'Liam Johnson', region: 'Dubai - UAE', legalEntity: 'ARM Holding - PRIVATE' },
  { name: 'Human Resources', managerId: '11181', managerName: 'Ethan Garcia', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI' },
  { name: 'Finance & Support Services', managerId: '11188', managerName: 'Amelia Gonzalez', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI' },
  { name: 'Government Relations', managerId: '11197', managerName: 'Henry Perez', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI' },
  { name: 'Operations', managerId: '11181', managerName: 'Ethan Garcia', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI' },
];

// ──────────────────────────────────────────────
// ALL EMPLOYEES (from client Excel — 22 employees)
// ──────────────────────────────────────────────
const allEmployeeData = [
  // Administration (PRIVATE)
  { employeeCode: '11176', firstName: 'Olivia', lastName: 'Smith', email: 'olivia.smith@armholding1.ae', phone: '+971-55-6009085', department: 'Administration', designation: 'Assistant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - PRIVATE', dateOfJoining: '2022-03-15', dateOfBirth: '1995-09-12', reportingManager: '11177', salary: { basic: 5000, livingAllowance: 2000, mobileAllowance: 500, gross: 7500 }, leaveBalance: { annual: 25, sick: 5, compensatoryOff: 0, total: 30 }, benefits: ['Air Ticket'] },
  { employeeCode: '11177', firstName: 'Liam', lastName: 'Johnson', email: 'liam.johnson@armholding1.ae', phone: '+971-55-6010002', department: 'Administration', designation: 'Senior Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - PRIVATE', dateOfJoining: '2021-07-20', dateOfBirth: '1993-04-25', reportingManager: '11181', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 13.5, sick: 3, compensatoryOff: 2, total: 18.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11178', firstName: 'Ava', lastName: 'Williams', email: 'ava.williams@armholding1.ae', phone: '+971-55-5010001', department: 'Administration', designation: 'Receptionist', region: 'Dubai - UAE', legalEntity: 'ARM Holding - PRIVATE', dateOfJoining: '2020-01-10', dateOfBirth: '1985-03-10', reportingManager: '11177', salary: { basic: 4000, livingAllowance: 500, mobileAllowance: 500, gross: 5000 }, leaveBalance: { annual: 14.5, sick: 5, compensatoryOff: 1.5, total: 21 }, benefits: ['Air Ticket'] },
  { employeeCode: '11179', firstName: 'Noah', lastName: 'Brown', email: 'noah.brown@armholding1.ae', phone: '+971-50-1230001', department: 'Administration', designation: 'Assistant Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - PRIVATE', dateOfJoining: '2019-04-01', dateOfBirth: '1982-06-15', reportingManager: '11177', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 10, sick: 2, compensatoryOff: 0, total: 12 }, benefits: ['Air Ticket'] },

  // Human Resources (CAPRI)
  { employeeCode: '11180', firstName: 'Sophia', lastName: 'Jones', email: 'sophia.jones@armholding1.ae', phone: '+971-55-5010002', department: 'Human Resources', designation: 'Senior Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-11', dateOfBirth: '1985-03-11', reportingManager: '11181', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 5.5, sick: 5, compensatoryOff: 0, total: 10.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11181', firstName: 'Ethan', lastName: 'Garcia', email: 'ethan.garcia@armholding1.ae', phone: '+971-50-1230002', department: 'Human Resources', designation: 'HR Director', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-02', dateOfBirth: '1982-06-16', reportingManager: '', salary: { basic: 30000, livingAllowance: 15000, mobileAllowance: 1000, gross: 46000 }, leaveBalance: { annual: 14, sick: 5, compensatoryOff: 0, total: 19 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11182', firstName: 'Isabella', lastName: 'Miller', email: 'isabella.miller@armholding1.ae', phone: '+971-55-5010003', department: 'Human Resources', designation: 'Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-12', dateOfBirth: '1985-03-12', reportingManager: '11181', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 28.5, sick: 5, compensatoryOff: 2, total: 35.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11183', firstName: 'Mason', lastName: 'Davis', email: 'mason.davis@armholding1.ae', phone: '+971-50-1230003', department: 'Human Resources', designation: 'Assistant Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-03', dateOfBirth: '1982-06-17', reportingManager: '11182', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 12, sick: 5, compensatoryOff: 0, total: 17 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11184', firstName: 'Mia', lastName: 'Rodriguez', email: 'mia.rodriguez@armholding1.ae', phone: '+971-55-5010004', department: 'Human Resources', designation: 'Executive', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-13', dateOfBirth: '1985-03-11', reportingManager: '11181', salary: { basic: 5000, livingAllowance: 2000, mobileAllowance: 500, gross: 7500 }, leaveBalance: { annual: 16, sick: 5, compensatoryOff: 5, total: 26 }, benefits: ['Air Ticket', 'Child Education'] },

  // Finance & Support Services (CAPRI)
  { employeeCode: '11185', firstName: 'Lucas', lastName: 'Martinez', email: 'lucas.martinez@armholding1.ae', phone: '+971-50-1230004', department: 'Finance & Support Services', designation: 'Accountant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-04', dateOfBirth: '1982-06-16', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 15.5, sick: 5, compensatoryOff: 0, total: 20.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11186', firstName: 'Charlotte', lastName: 'Hernandez', email: 'charlotte.hernandez@armholding1.ae', phone: '+971-55-5010005', department: 'Finance & Support Services', designation: 'Accounts Assistant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-14', dateOfBirth: '1985-03-12', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 15, sick: 5, compensatoryOff: 3, total: 23 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11187', firstName: 'Benjamin', lastName: 'Lopez', email: 'benjamin.lopez@armholding1.ae', phone: '+971-50-1230005', department: 'Finance & Support Services', designation: 'Accountant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-05', dateOfBirth: '1982-06-17', reportingManager: '11189', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 14.5, sick: 5, compensatoryOff: 0, total: 19.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11188', firstName: 'Amelia', lastName: 'Gonzalez', email: 'amelia.gonzalez@armholding1.ae', phone: '+971-55-5010006', department: 'Finance & Support Services', designation: 'Chief Accountant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-15', dateOfBirth: '1985-03-13', reportingManager: '11181', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 14, sick: 5, compensatoryOff: 0, total: 19 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11189', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@armholding1.ae', phone: '+971-50-1230006', department: 'Finance & Support Services', designation: 'Senior Accountant', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-06', dateOfBirth: '1982-06-18', reportingManager: '11188', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 13.5, sick: 5, compensatoryOff: 0, total: 18.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11190', firstName: 'Harper', lastName: 'Anderson', email: 'harper.anderson@armholding1.ae', phone: '+971-55-5010007', department: 'Finance & Support Services', designation: 'Cashier', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-16', dateOfBirth: '1985-03-12', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 13, sick: 5, compensatoryOff: 0, total: 18 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11191', firstName: 'Alexander', lastName: 'Thomas', email: 'alexander.thomas@armholding1.ae', phone: '+971-50-1230007', department: 'Finance & Support Services', designation: 'Cashier', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-07', dateOfBirth: '1982-06-17', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 12.5, sick: 5, compensatoryOff: 0, total: 17.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11192', firstName: 'Evelyn', lastName: 'Taylor', email: 'evelyn.taylor@armholding1.ae', phone: '+971-55-5010008', department: 'Finance & Support Services', designation: 'Cashier', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-17', dateOfBirth: '1985-03-13', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 12, sick: 5, compensatoryOff: 2.5, total: 19.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11193', firstName: 'Michael', lastName: 'Moore', email: 'michael.moore@armholding1.ae', phone: '+971-50-1230008', department: 'Finance & Support Services', designation: 'Cashier', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-08', dateOfBirth: '1982-06-18', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 11.5, sick: 5, compensatoryOff: 0, total: 16.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11194', firstName: 'Abigail', lastName: 'Jackson', email: 'abigail.jackson@armholding1.ae', phone: '+971-55-5010009', department: 'Finance & Support Services', designation: 'Cashier', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-18', dateOfBirth: '1985-03-14', reportingManager: '11188', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 21, sick: 5, compensatoryOff: 0, total: 26 }, benefits: ['Air Ticket', 'Child Education'] },

  // Government Relations (CAPRI)
  { employeeCode: '11195', firstName: 'Daniel', lastName: 'Martin', email: 'daniel.martin@armholding1.ae', phone: '+971-50-1230009', department: 'Government Relations', designation: 'Executive', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-09', dateOfBirth: '1982-06-19', reportingManager: '11197', salary: { basic: 7000, livingAllowance: 2000, mobileAllowance: 500, gross: 9500 }, leaveBalance: { annual: 22, sick: 5, compensatoryOff: 0, total: 27 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11196', firstName: 'Emily', lastName: 'Lee', email: 'emily.lee@armholding1.ae', phone: '+971-55-5010010', department: 'Government Relations', designation: 'Senior Manager', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2020-01-19', dateOfBirth: '1985-03-13', reportingManager: '11197', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 24, sick: 5, compensatoryOff: 3.5, total: 32.5 }, benefits: ['Air Ticket', 'Child Education'] },
  { employeeCode: '11197', firstName: 'Henry', lastName: 'Perez', email: 'henry.perez@armholding1.ae', phone: '+971-50-1230010', department: 'Government Relations', designation: 'Public Relations Incharge', region: 'Dubai - UAE', legalEntity: 'ARM Holding - CAPRI', dateOfJoining: '2019-04-10', dateOfBirth: '1982-06-18', reportingManager: '11181', salary: { basic: 18000, livingAllowance: 5000, mobileAllowance: 1000, gross: 24000 }, leaveBalance: { annual: 15.5, sick: 5, compensatoryOff: 0, total: 20.5 }, benefits: ['Air Ticket', 'Child Education'] },
];

// ──────────────────────────────────────────────
// ROLE MAPPING (from client Excel User Roles sheet)
// ──────────────────────────────────────────────
// hr_head: Ethan Garcia (11181) — HR Director / Super User
// manager: Liam Johnson (11177), Isabella Miller (11182), Amelia Gonzalez (11188), James Wilson (11189), Henry Perez (11197)
// employee: all others
function getRoleForCode(code) {
  if (code === '11181') return 'hr_head';
  if (['11177', '11182', '11188', '11189', '11197'].includes(code)) return 'manager';
  return 'employee';
}

// Enrich employee with computed fields
const leaveReasons = ['Family function', 'Personal work', 'Medical checkup', 'Festival', 'Vacation', 'Feeling unwell', 'Urgent work'];
const leaveTypes = ['Annual', 'Sick', 'Compensatory Off'];

function enrichEmployee(emp) {
  emp.employmentType = 'Full-Time';
  emp.status = 'Active';
  emp.salary.deductions = { pf: 0, professionalTax: 0, tds: 0 };
  emp.salary.netPay = emp.salary.gross;
  emp.leaveHistory = Array.from({ length: 3 }, (_, i) => ({
    type: leaveTypes[i % 3],
    from: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 20) + 1),
    to: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 20) + 3),
    days: Math.floor(Math.random() * 3) + 1,
    reason: leaveReasons[Math.floor(Math.random() * leaveReasons.length)],
    status: ['Approved', 'Approved', 'Pending'][Math.floor(Math.random() * 3)],
  }));
  return emp;
}

// ──────────────────────────────────────────────
// PDF GENERATION
// ──────────────────────────────────────────────
function generatePDF(filename, title, content) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const filePath = path.join(DOCS_DIR, filename);
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(8).fillColor('#5A6579').text('ARM HOLDING', { align: 'right' });
    doc.fontSize(8).text('NSOffice.AI', { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(20).fillColor('#2F343E').text(title, { align: 'center' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#BDC3D0');
    doc.moveDown(1);

    doc.fontSize(11).fillColor('#2F343E');
    content.forEach(line => {
      if (line.startsWith('##')) {
        doc.moveDown(0.5).fontSize(14).fillColor('#2F343E').text(line.replace('## ', ''));
        doc.moveDown(0.3);
      } else if (line.startsWith('**')) {
        doc.fontSize(11).fillColor('#5A6579').text(line.replace(/\*\*/g, ''), { continued: false });
      } else {
        doc.fontSize(11).fillColor('#2F343E').text(line);
      }
    });

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#BDC3D0');
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor('#9CA6BA').text('This is a confidential document. Unauthorized distribution is prohibited.', { align: 'center' });
    doc.fontSize(8).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);
  });
}

// ──────────────────────────────────────────────
// DOCUMENT SEEDING
// ──────────────────────────────────────────────
async function seedDocuments(allEmployees) {
  const documents = [];

  for (const emp of allEmployees) {
    // Offer Letter
    const offerFile = `offer_letter_${emp.employeeCode}.pdf`;
    await generatePDF(offerFile, `Offer Letter - ${emp.firstName} ${emp.lastName}`, [
      `Date: ${new Date(emp.dateOfJoining).toLocaleDateString()}`,
      '', `Dear ${emp.firstName} ${emp.lastName},`, '',
      `We are pleased to offer you the position of ${emp.designation} in the ${emp.department} department at ARM Holding.`,
      '',
      '## Compensation Details',
      `**Basic Salary: AED ${emp.salary.basic?.toLocaleString()} per month`,
      `**Living Allowance: AED ${emp.salary.livingAllowance?.toLocaleString()} per month`,
      `**Mobile Allowance: AED ${emp.salary.mobileAllowance?.toLocaleString()} per month`,
      `**Gross Salary: AED ${emp.salary.gross?.toLocaleString()} per month`,
      '',
      '## Terms & Conditions',
      '• Your joining date will be as communicated by the HR team.',
      '• This offer is subject to successful background verification.',
      '• Benefits as per company policy.', '',
      'Best Regards,', 'HR Team, ARM Holding',
    ]);
    documents.push({
      title: `Offer Letter - ${emp.firstName} ${emp.lastName}`, type: 'Offer Letter',
      department: emp.department, region: emp.region,
      taggedEmployees: [emp.employeeCode], taggedDepartments: [emp.department],
      uploadedBy: '11181', uploadDate: emp.dateOfJoining,
      fileUrl: `/api/documents/file/${offerFile}`, accessLevel: 'employee',
      description: `Offer letter for ${emp.firstName} ${emp.lastName}`,
    });

    // Payslip Jan 2025
    const payslipFile = `payslip_jan2025_${emp.employeeCode}.pdf`;
    await generatePDF(payslipFile, `Payslip - January 2025`, [
      `Employee: ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
      `Department: ${emp.department}`, `Designation: ${emp.designation}`,
      `Legal Entity: ${emp.legalEntity}`, `Pay Period: January 1 - January 31, 2025`, '',
      '## Earnings',
      `**Basic Salary: AED ${emp.salary.basic?.toLocaleString()}`,
      `**Living Allowance: AED ${emp.salary.livingAllowance?.toLocaleString()}`,
      `**Mobile Allowance: AED ${emp.salary.mobileAllowance?.toLocaleString()}`,
      `**Gross Pay: AED ${emp.salary.gross?.toLocaleString()}`, '',
      `**Net Pay: AED ${emp.salary.gross?.toLocaleString()}`,
      '', 'Note: UAE does not levy personal income tax.',
    ]);
    documents.push({
      title: `Payslip Jan 2025 - ${emp.firstName} ${emp.lastName}`, type: 'Payslip',
      department: emp.department, region: emp.region,
      taggedEmployees: [emp.employeeCode], taggedDepartments: [emp.department],
      uploadedBy: '11181', uploadDate: '2025-02-01',
      fileUrl: `/api/documents/file/${payslipFile}`, accessLevel: 'employee',
      description: `January 2025 payslip for ${emp.firstName} ${emp.lastName}`,
    });
  }

  // Organization-level policy documents
  const policies = [
    { filename: 'leave_policy.pdf', title: 'Leave Policy', description: 'Company-wide leave policy',
      content: ['## 1. Scope', 'This policy applies to all employees of ARM Holding (PRIVATE & CAPRI entities).', '',
        '## 2. Leave Types & Entitlements', '**Annual Leave: 30 days/year (CAPRI) / 35 days/year (PRIVATE)',
        '**Sick Leave: Up to 90 days/year (UAE Labour Law)', '**Compensatory Off: As approved by manager', '',
        '## 3. Leave Application', '• Submit leave requests via NSOffice.AI at least 2 days in advance.',
        '• Sick leave requires medical certificate for absences exceeding 2 days.', '• Annual leave can be carried forward as per policy.', '',
        '## 4. Approval', '• Approved by reporting manager.', '• HR Director has override authority.'] },
    { filename: 'travel_policy.pdf', title: 'Travel Policy', description: 'Business travel and expense policy',
      content: ['## 1. Purpose', 'Governs business travel expenses and reimbursements.', '',
        '## 2. Authorization', '• Pre-approved by department manager.', '• Submit 5 business days in advance.', '',
        '## 3. Expense Limits', '**Hotel: AED 1,000/night (Dubai), AED 800/night (others)',
        '**Meals: AED 300/day', '**Transport: Actual with receipts', '',
        '## 4. Reimbursement', '• Submit within 7 days.', '• Original receipts required.'] },
    { filename: 'employee_handbook.pdf', title: 'Employee Handbook', description: 'Comprehensive employee handbook',
      content: ['## Welcome to ARM Holding', 'This handbook is your guide to our culture and expectations.', '',
        '## Working Hours', '• 9:00 AM to 6:00 PM, Sunday to Thursday.', '• Friday and Saturday are weekly off.',
        '• Ramadan: reduced by 2 hours.', '', '## Code of Conduct',
        '• Professional behavior at all times.', '• Respect diversity.', '• Protect confidential information.'] },
    { filename: 'it_security_policy.pdf', title: 'IT Security Policy', description: 'IT security guidelines',
      content: ['## 1. Purpose', 'IT security standards for all employees.', '',
        '## 2. Passwords', '• Minimum 12 characters.', '• Change every 90 days.', '• MFA mandatory.', '',
        '## 3. Data Protection', '• No company data on personal devices.', '• Encrypted channels only.', '• Report incidents to IT.'] },
    { filename: 'anti_harassment_policy.pdf', title: 'Anti-Harassment Policy', description: 'Workplace anti-harassment policy',
      content: ['## 1. Policy', 'ARM Holding is committed to a harassment-free workplace.', '',
        '## 2. Reporting', '• Report to HR or via NSOffice.AI.', '• Anonymous reporting available.', '• Investigated confidentially.', '',
        '## 3. Consequences', '• Disciplinary action up to termination.', '• No retaliation tolerated.'] },
    { filename: 'code_of_conduct.pdf', title: 'Code of Conduct', description: 'Company code of conduct',
      content: ['## 1. Ethics', 'Maintain highest ethical standards.', '', '## 2. Conflict of Interest',
        '• Disclose potential conflicts.', '• No competing business activities.', '', '## 3. Confidentiality',
        '• Protect proprietary information.', '• No unauthorized data sharing.', '', '## 4. Professional Conduct',
        '• Respect all colleagues.', '• Business formal dress code.'] },
    { filename: 'paternity_leave_policy.pdf', title: 'Paternity Leave Policy', description: 'Paternity leave entitlements',
      content: ['## 1. Scope', 'Applies to all full-time male employees.', '',
        '## 2. Entitlement', '**5 working days paid leave (UAE Labour Law)', '• Within 6 months of child\'s birth.', '',
        '## 3. Process', '• Submit via NSOffice.AI.', '• Attach birth certificate.'] },
    { filename: 'maternity_leave_policy.pdf', title: 'Maternity Leave Policy', description: 'Maternity leave entitlements',
      content: ['## 1. Scope', 'Applies to all female employees with 1+ year of service.', '',
        '## 2. Entitlement', '**60 days (45 full pay + 15 half pay)', '**Extended: 45 days unpaid if needed.', '',
        '## 3. Process', '• Submit 8 weeks before expected delivery.', '• Attach medical certificate.'] },
    { filename: 'remote_work_policy.pdf', title: 'Remote Work Policy', description: 'Remote/hybrid work guidelines',
      content: ['## 1. Purpose', 'Framework for remote and hybrid work at ARM Holding.', '',
        '## 2. Models', '**Office-First (Default): Sunday to Thursday in office.',
        '**Hybrid: Upon manager approval.', '', '## 3. Guidelines',
        '• Reachable 10 AM - 4 PM.', '• Company security policies apply.'] },
    { filename: 'grievance_redressal_policy.pdf', title: 'Grievance Redressal Policy', description: 'Grievance handling procedure',
      content: ['## 1. Purpose', 'Structured process for workplace grievances.', '',
        '## 2. Process', '**Step 1: Discuss with supervisor.', '**Step 2: Submit via NSOffice.AI.',
        '**Step 3: HR investigates within 5 days.', '**Step 4: Resolution committee within 10 days.', '',
        '## 3. Confidentiality', '• Strict confidentiality.', '• No retaliation.'] },
  ];

  for (const policy of policies) {
    await generatePDF(policy.filename, policy.title, policy.content);
    documents.push({
      title: policy.title, type: 'Policy', department: 'All', region: 'All',
      taggedEmployees: [], taggedDepartments: departments.map(d => d.name),
      uploadedBy: '11181', uploadDate: '2024-01-01',
      fileUrl: `/api/documents/file/${policy.filename}`, accessLevel: 'organization',
      description: policy.description,
    });
  }

  return documents;
}

// ──────────────────────────────────────────────
// MAIN SEED
// ──────────────────────────────────────────────
async function seed() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.includes('<username>')) {
      console.error('Please configure MONGODB_URI in .env file first!');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB Atlas');

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}), Employee.deleteMany({}), Document.deleteMany({}),
      Department.deleteMany({}), ChatHistory.deleteMany({}),
    ]);

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    console.log('Creating departments...');
    await Department.insertMany(departments);

    const allEmployees = allEmployeeData.map(enrichEmployee);

    console.log('Creating employees...');
    await Employee.insertMany(allEmployees);

    console.log('Creating user accounts...');
    const users = allEmployees.map(emp => ({
      employeeCode: emp.employeeCode, password: hashedPassword,
      role: getRoleForCode(emp.employeeCode),
      firstName: emp.firstName, lastName: emp.lastName,
      department: emp.department, region: emp.region,
    }));
    await User.insertMany(users);

    console.log('Generating documents and PDFs...');
    const docs = await seedDocuments(allEmployees);
    await Document.insertMany(docs);

    console.log('\nSeed completed successfully!\n');
    console.log('===================================================');
    console.log('  DEMO LOGIN CREDENTIALS (Password: nsoffice123)');
    console.log('===================================================');
    console.log('\n  HR Head (Full Access):');
    console.log(`    11181 - Ethan Garcia (HR Director)`);
    console.log('\n  Managers (Department Access):');
    ['11177', '11182', '11188', '11189', '11197'].forEach(code => {
      const m = allEmployees.find(e => e.employeeCode === code);
      console.log(`    ${m.employeeCode} - ${m.firstName} ${m.lastName} (${m.designation}, ${m.department})`);
    });
    console.log('\n  Employees (Own Data Only):');
    allEmployees.filter(e => getRoleForCode(e.employeeCode) === 'employee').forEach(e => {
      console.log(`    ${e.employeeCode} - ${e.firstName} ${e.lastName} (${e.department})`);
    });
    console.log('\n===================================================');
    console.log(`  Total: ${allEmployees.length} users, ${docs.length} documents`);
    console.log('===================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
