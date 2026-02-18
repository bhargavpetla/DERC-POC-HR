const { GoogleGenerativeAI } = require('@google/generative-ai');
const Employee = require('../models/Employee');
const Document = require('../models/Document');
const Department = require('../models/Department');

let genAI = null;
let model = null;

function initGemini() {
  if (!genAI && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }
  return !!model;
}

async function processMessage(message, user) {
  const { role, employeeCode, department, firstName } = user;

  // Gather context data based on RBAC
  const contextData = await gatherContext(message, role, employeeCode, department);

  // Try Gemini first, fall back to rule-based
  if (initGemini()) {
    try {
      return await geminiResponse(message, user, contextData);
    } catch (err) {
      console.error('Gemini error, falling back to rule-based:', err.message);
    }
  }

  // Fallback: rule-based engine
  return await ruleBasedResponse(message, user, contextData);
}

async function gatherContext(message, role, employeeCode, department) {
  const msg = message.toLowerCase();
  const context = {};

  // Always get own employee data
  context.self = await Employee.findOne({ employeeCode }).lean();

  // Get departments
  context.departments = await Department.find().lean();

  // Employee lookup by code (numeric codes like 11176, 11181 etc.)
  const empCodeMatch = msg.match(/\b(1\d{4})\b/);
  if (empCodeMatch) {
    const targetCode = empCodeMatch[1];
    const target = await Employee.findOne({ employeeCode: targetCode }).lean();
    if (target) {
      // RBAC check
      if (role === 'hr_head' ||
          (role === 'manager' && target.department === department) ||
          (role === 'employee' && target.employeeCode === employeeCode)) {
        context.targetEmployee = target;
      } else {
        context.accessDenied = true;
        context.deniedTarget = targetCode;
      }
    } else {
      context.employeeNotFound = targetCode;
    }
  }

  // Leave queries
  if (/leave|balance|vacation|time.?off|pto|annual/.test(msg)) {
    if (/team|all|everyone|department/.test(msg)) {
      if (role === 'hr_head') {
        context.teamLeaves = await Employee.find({}).select('employeeCode firstName lastName leaveBalance department').lean();
      } else if (role === 'manager') {
        context.teamLeaves = await Employee.find({ department }).select('employeeCode firstName lastName leaveBalance department').lean();
      }
    }
  }

  // Salary queries
  if (/salary|payslip|pay|compensation|ctc|package|deduction|net|gross|allowance/.test(msg)) {
    if (role === 'employee') {
      context.payslips = await Document.find({ taggedEmployees: employeeCode, type: 'Payslip' }).sort({ uploadDate: -1 }).limit(3).lean();
    } else if (role === 'manager') {
      if (!context.targetEmployee) {
        context.teamSalaries = await Employee.find({ department }).select('employeeCode firstName lastName salary').lean();
      }
      context.payslips = await Document.find({ department, type: 'Payslip' }).sort({ uploadDate: -1 }).limit(5).lean();
    } else {
      context.payslips = await Document.find({ type: 'Payslip' }).sort({ uploadDate: -1 }).limit(10).lean();
    }
  }

  // Team queries
  if (/team|report|direct|headcount|member|staff/.test(msg)) {
    if (role === 'hr_head') {
      context.allEmployees = await Employee.find({}).select('employeeCode firstName lastName department designation status region').lean();
    } else if (role === 'manager') {
      context.teamMembers = await Employee.find({ department }).select('employeeCode firstName lastName designation status').lean();
    }
  }

  // Policy queries
  if (/policy|policies|handbook|guideline|rule|compliance|paternity|maternity|remote.?work|grievance|redressal/.test(msg)) {
    context.policies = await Document.find({ type: 'Policy', accessLevel: 'organization' }).lean();
  }

  // Benefits
  if (/benefit|insurance|perk|ticket|air.?ticket|education|child/.test(msg)) {
    if (role === 'hr_head') {
      const allEmps = await Employee.find({}).select('benefits').lean();
      const benefitCounts = {};
      allEmps.forEach(e => e.benefits?.forEach(b => { benefitCounts[b] = (benefitCounts[b] || 0) + 1; }));
      context.benefitsSummary = benefitCounts;
    }
  }

  // Document queries
  if (/document|offer.?letter|contract|appraisal|id.?proof|certificate|tax|appointment/.test(msg)) {
    let docFilter = {};
    if (role === 'employee') {
      docFilter.$or = [{ taggedEmployees: employeeCode }, { accessLevel: 'organization' }];
    } else if (role === 'manager') {
      docFilter.$or = [{ taggedDepartments: department }, { department }, { accessLevel: 'organization' }];
    }
    context.documents = await Document.find(docFilter).sort({ uploadDate: -1 }).limit(15).lean();
  }

  // Department queries
  if (/department|administration|human.?resources|finance|government.?relations|operations/.test(msg)) {
    const depts = await Department.find().lean();
    context.departmentStats = await Promise.all(depts.map(async (d) => {
      const count = await Employee.countDocuments({ department: d.name });
      return { ...d, employeeCount: count };
    }));
  }

  return context;
}

async function geminiResponse(message, user, contextData) {
  const { role, employeeCode, department, firstName, lastName } = user;

  const systemPrompt = `You are "Veda", the NSOffice.AI HR Concierge Assistant for ARM Holding.
You are helpful, professional, and friendly. You address users by their first name.

CURRENT USER:
- Name: ${firstName} ${lastName || ''}
- Employee Code: ${employeeCode}
- Role: ${role === 'hr_head' ? 'HR Director (Full Access)' : role === 'manager' ? `Department Manager (${department} department only)` : 'Employee (own data only)'}
- Department: ${department || 'N/A'}

COMPANY: ARM Holding, Dubai UAE. Two legal entities: PRIVATE and CAPRI.
Currency: AED (UAE Dirhams). No income tax in UAE.

STRICT RBAC RULES (NEVER VIOLATE):
${role === 'employee' ? `- This user can ONLY see their OWN data (leave, salary, documents, benefits).
- NEVER reveal other employees' personal data, salary, or leave info.
- They CAN view company-wide policies and their own manager's name.
- If they ask about others, politely decline and explain they can only view their own records.` :
role === 'manager' ? `- This user can see their OWN data and their TEAM data (${department} department only).
- They can see leave balances, salary details, and documents for employees in ${department}.
- They CANNOT see data from other departments.
- If they ask about other departments, politely decline and explain scope.` :
`- This user has FULL ACCESS as HR Director.
- They can view ALL employees, ALL departments, ALL documents, ALL salary data.
- They can see organization-wide analytics and summaries.`}

SALARY STRUCTURE: Basic Salary + Living Allowance + Mobile Allowance = Gross. Net Pay = Gross (no tax in UAE).
LEAVE STRUCTURE: Annual Leave (30 or 35 days/year), Sick Leave (up to 90 days/year), Compensatory Off.

RESPONSE FORMAT:
- Be conversational but concise.
- Use bullet points for lists.
- Use bold (**text**) for emphasis.
- When showing tabular data, format it as a clean markdown table.
- For currency, use AED symbol.
- Do NOT make up data. Only use the CONTEXT DATA provided below.
- If data is not available in context, say you don't have that information and suggest they contact HR.

CONTEXT DATA (only use this data, do not fabricate):
${JSON.stringify(contextData, null, 2)}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  });

  const responseText = result.response.text();

  const response = { content: responseText, type: 'text' };

  // Attach documents if relevant
  if (contextData.policies && /policy|policies/.test(message.toLowerCase())) {
    response.type = 'documents';
    response.documents = contextData.policies.map(p => ({ title: p.title, fileUrl: p.fileUrl, type: p.type, description: p.description }));
  }

  if (contextData.documents && /document|certificate|letter|proof/.test(message.toLowerCase())) {
    response.type = 'documents';
    response.documents = contextData.documents.map(d => ({ title: d.title, fileUrl: d.fileUrl, type: d.type, description: d.description }));
  }

  if (contextData.payslips?.length > 0 && /payslip/.test(message.toLowerCase())) {
    response.documents = contextData.payslips.map(d => ({ title: d.title, fileUrl: d.fileUrl, type: d.type }));
  }

  return response;
}

// ──────── FALLBACK: Rule-based engine ──────── //

async function ruleBasedResponse(message, user, contextData) {
  const msg = message.toLowerCase();
  const { role, employeeCode, department, firstName } = user;

  // Greeting
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(msg)) {
    return {
      content: `Hello ${firstName}! I'm Veda, your HR Concierge. I can help you with:\n\n• **Leave Balance** — Check your remaining leaves\n• **Payslip & Salary** — View compensation details\n• **HR Policies** — Browse company policies\n• **Team Info** — ${role === 'employee' ? 'View your manager info' : 'View your team details'}\n• **Benefits** — Check your benefits\n• **Documents** — Access your documents\n\nWhat would you like to know?`,
      type: 'text',
    };
  }

  // Access denied
  if (contextData.accessDenied) {
    return {
      content: `I'm sorry ${firstName}, you don't have permission to view information for employee ${contextData.deniedTarget}. ${role === 'employee' ? 'You can only view your own records.' : `You can only view information for your department (${department}).`}`,
      type: 'text',
    };
  }

  // Employee not found
  if (contextData.employeeNotFound) {
    return { content: `Employee ${contextData.employeeNotFound} was not found in the system.`, type: 'text' };
  }

  // Specific employee lookup
  if (contextData.targetEmployee) {
    const t = contextData.targetEmployee;
    if (/leave|balance/.test(msg)) {
      const entitlement = t.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `Here's the leave balance for **${t.firstName} ${t.lastName}** (${t.employeeCode}):`,
        type: 'table',
        data: { headers: ['Leave Type', 'Available', 'Entitlement'], rows: [['Annual', String(t.leaveBalance?.annual), String(entitlement)], ['Sick', String(t.leaveBalance?.sick), '90'], ['Comp. Off', String(t.leaveBalance?.compensatoryOff || 0), '—'], ['**Total**', `**${t.leaveBalance?.total}**`, '']] },
      };
    }
    if (/salary|pay/.test(msg)) {
      return {
        content: `Salary details for **${t.firstName} ${t.lastName}** (${t.employeeCode}):`,
        type: 'table',
        data: { headers: ['Component', 'Amount (AED)'], rows: [['Basic', `${t.salary?.basic?.toLocaleString()}`], ['Living Allowance', `${t.salary?.livingAllowance?.toLocaleString()}`], ['Mobile Allowance', `${t.salary?.mobileAllowance?.toLocaleString()}`], ['**Gross/Net**', `**${t.salary?.gross?.toLocaleString()}**`]] },
      };
    }
    return {
      content: `**${t.firstName} ${t.lastName}** (${t.employeeCode})\n\n• **Department:** ${t.department}\n• **Designation:** ${t.designation}\n• **Region:** ${t.region}\n• **Legal Entity:** ${t.legalEntity}\n• **Email:** ${t.email}\n• **Phone:** ${t.phone}\n• **Joining Date:** ${new Date(t.dateOfJoining).toLocaleDateString()}\n• **Status:** ${t.status}`,
      type: 'text',
    };
  }

  // Leave balance
  if (/leave|balance|vacation|pto|annual/.test(msg)) {
    if (contextData.teamLeaves) {
      return {
        content: `Leave balance for ${role === 'hr_head' ? 'all employees' : `your team in **${department}**`}:`,
        type: 'table',
        data: { headers: ['Name', 'Code', 'Annual', 'Sick', 'Comp. Off', 'Total'], rows: contextData.teamLeaves.map(e => [`${e.firstName} ${e.lastName}`, e.employeeCode, String(e.leaveBalance?.annual), String(e.leaveBalance?.sick), String(e.leaveBalance?.compensatoryOff || 0), String(e.leaveBalance?.total)]) },
      };
    }
    if (contextData.self) {
      const s = contextData.self;
      const entitlement = s.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `Hi ${firstName}! Here's your leave balance:`,
        type: 'table',
        data: { headers: ['Leave Type', 'Available', 'Entitlement'], rows: [['Annual', String(s.leaveBalance?.annual), String(entitlement)], ['Sick', String(s.leaveBalance?.sick), '90'], ['Comp. Off', String(s.leaveBalance?.compensatoryOff || 0), '—'], ['**Total**', `**${s.leaveBalance?.total}**`, '']] },
      };
    }
  }

  // Salary
  if (/salary|payslip|pay|compensation|ctc|allowance/.test(msg)) {
    const s = contextData.self;
    if (s) {
      const resp = {
        content: `Hi ${firstName}! Your salary breakdown:`,
        type: 'table',
        data: { headers: ['Component', 'Amount (AED)'], rows: [['Basic', `${s.salary?.basic?.toLocaleString()}`], ['Living Allowance', `${s.salary?.livingAllowance?.toLocaleString()}`], ['Mobile Allowance', `${s.salary?.mobileAllowance?.toLocaleString()}`], ['**Gross/Net**', `**${s.salary?.gross?.toLocaleString()}**`]] },
      };
      if (contextData.payslips?.length) {
        resp.documents = contextData.payslips.map(d => ({ title: d.title, fileUrl: d.fileUrl, type: d.type }));
      }
      return resp;
    }
  }

  // Policies
  if (/policy|policies|handbook|guideline|paternity|maternity|remote.?work|grievance/.test(msg)) {
    if (contextData.policies?.length) {
      return {
        content: `Here are the company policy documents:`,
        type: 'documents',
        documents: contextData.policies.map(p => ({ title: p.title, fileUrl: p.fileUrl, type: p.type, description: p.description })),
      };
    }
    return { content: 'No policy documents are currently available.', type: 'text' };
  }

  // Team
  if (/team|report|direct|headcount|member|staff/.test(msg)) {
    if (role === 'employee') {
      return { content: `Sorry ${firstName}, you don't have permission to view team information.`, type: 'text' };
    }
    const team = contextData.allEmployees || contextData.teamMembers;
    if (team) {
      return {
        content: `${role === 'hr_head' ? 'All employees' : `Your team in **${department}**`} (${team.length}):`,
        type: 'table',
        data: { headers: ['Code', 'Name', 'Designation', 'Department', 'Status'], rows: team.map(e => [e.employeeCode, `${e.firstName} ${e.lastName}`, e.designation, e.department, e.status]) },
      };
    }
  }

  // Manager
  if (/manager|reporting|supervisor|boss/.test(msg)) {
    const s = contextData.self;
    if (s?.reportingManager) {
      const mgr = await Employee.findOne({ employeeCode: s.reportingManager });
      if (mgr) {
        return { content: `Your reporting manager is **${mgr.firstName} ${mgr.lastName}** (${mgr.employeeCode})\n\n• **Designation:** ${mgr.designation}\n• **Department:** ${mgr.department}\n• **Email:** ${mgr.email}\n• **Phone:** ${mgr.phone}`, type: 'text' };
      }
    }
    return { content: `Hi ${firstName}! No reporting manager is assigned in the system.`, type: 'text' };
  }

  // Benefits
  if (/benefit|insurance|perk|ticket|air.?ticket|education|child/.test(msg)) {
    if (contextData.benefitsSummary) {
      return {
        content: 'Benefits enrollment summary:',
        type: 'table',
        data: { headers: ['Benefit', 'Enrolled'], rows: Object.entries(contextData.benefitsSummary).map(([b, c]) => [b, String(c)]) },
      };
    }
    if (contextData.self?.benefits) {
      return { content: `Hi ${firstName}! Your benefits:\n\n${contextData.self.benefits.map(b => `• ${b}`).join('\n')}`, type: 'text' };
    }
  }

  // Documents
  if (/document|letter|contract|appraisal|proof|certificate|tax|appointment/.test(msg)) {
    if (contextData.documents?.length) {
      return {
        content: 'Your accessible documents:',
        type: 'documents',
        documents: contextData.documents.map(d => ({ title: d.title, fileUrl: d.fileUrl, type: d.type, description: d.description })),
      };
    }
    return { content: 'No documents found. Please contact HR.', type: 'text' };
  }

  // Department
  if (contextData.departmentStats) {
    if (role === 'manager') {
      const myDept = contextData.departmentStats.find(d => d.name === department);
      if (myDept) return { content: `**${myDept.name}** department:\n\n• **Manager:** ${myDept.managerName}\n• **Region:** ${myDept.region}\n• **Headcount:** ${myDept.employeeCount}`, type: 'text' };
    }
    return {
      content: 'Department overview:',
      type: 'table',
      data: { headers: ['Department', 'Manager', 'Region', 'Headcount'], rows: contextData.departmentStats.map(d => [d.name, d.managerName || d.managerId, d.region, String(d.employeeCount)]) },
    };
  }

  // Help
  if (/help|what can you|how|assist/.test(msg)) {
    return {
      content: `Hi ${firstName}! I'm Veda, your HR Concierge. I can help with:\n\n• **"What is my leave balance?"**\n• **"Show my payslip"**\n• **"Company policies"**\n• **"Who is my manager?"**\n• **"My benefits"**\n• **"My documents"**${role !== 'employee' ? '\n• **"Show my team"**' : ''}\n\nJust type naturally!`,
      type: 'text',
    };
  }

  return {
    content: `I'm sorry, I didn't quite understand that. I can help you with leave balance, salary, policies, benefits, documents, and team information. Could you try rephrasing?`,
    type: 'text',
  };
}

module.exports = { processMessage };
