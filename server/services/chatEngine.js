const OpenAI = require('openai');
const Employee = require('../models/Employee');
const Document = require('../models/Document');
const Department = require('../models/Department');

let openai = null;

function initOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'YOUR_OPENAI_API_KEY_HERE') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
    console.log('✅ OpenAI initialized');
  }
  return !!openai;
}

async function processMessage(message, user) {
  const { role, employeeCode, department } = user;

  // Gather context data based on RBAC
  const contextData = await gatherContext(message, role, employeeCode, department);

  // Try OpenAI first, fall back to rule-based
  if (initOpenAI()) {
    try {
      return await aiResponse(message, user, contextData);
    } catch (err) {
      console.error('OpenAI error, falling back to rule-based:', err.message);
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

  // Employee lookup by code
  const empCodeMatch = msg.match(/\b(1\d{4})\b/);
  if (empCodeMatch) {
    const targetCode = empCodeMatch[1];
    const target = await Employee.findOne({ employeeCode: targetCode }).lean();
    if (target) {
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

  // Team / employee list queries
  if (/team|report|direct|headcount|member|staff|employee|show all/.test(msg)) {
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
  if (/department|overview|administration|human.?resources|finance|government.?relations|operations/.test(msg)) {
    const depts = await Department.find().lean();
    context.departmentStats = await Promise.all(depts.map(async (d) => {
      const count = await Employee.countDocuments({ department: d.name });
      return { ...d, employeeCount: count };
    }));
  }

  return context;
}

// ──────── OpenAI Response ──────── //

async function aiResponse(message, user, contextData) {
  const { role, employeeCode, department, firstName, lastName } = user;

  const systemPrompt = `You are "Veda", the NSOffice.AI HR Concierge Assistant for ARM Holding, Dubai UAE.
You are warm, professional, and conversational — like a helpful colleague, not a robot.

CURRENT USER:
- Name: ${firstName} ${lastName || ''}
- Employee Code: ${employeeCode}
- Role: ${role === 'hr_head' ? 'HR Director (Full Access)' : role === 'manager' ? `Department Manager (${department} only)` : 'Employee (own data only)'}
- Department: ${department || 'N/A'}

COMPANY: ARM Holding, Dubai UAE. Legal entities: ARM Holding - PRIVATE, ARM Holding - CAPRI.
Currency: AED (UAE Dirhams). No income tax in UAE.
Salary = Basic + Living Allowance + Mobile Allowance = Gross (Net = Gross, no deductions).
Leave = Annual (30-35 days) + Sick (up to 90 days) + Compensatory Off.

STRICT RBAC RULES — NEVER VIOLATE:
${role === 'employee' ? `- This user can ONLY see their OWN data. NEVER reveal other employees' info.
- They CAN view company policies and their manager's name.` :
role === 'manager' ? `- This user can see their own data + their team in ${department} ONLY.
- CANNOT access other departments' data.` :
`- This user has FULL ACCESS as HR Director — all employees, departments, documents.`}

HOW TO RESPOND:
- Be conversational and natural, like ChatGPT. Don't just dump data.
- Start with a brief friendly sentence, then present the information.
- Use markdown for formatting: **bold**, bullet points, headers (###).
- Use markdown tables ONLY when showing multiple records (3+ rows). For single records, use bullet points or a natural sentence.
- For currency, write "AED 12,000" not just "12000".
- When mentioning downloadable documents, use markdown links: [Document Name](url)
- Keep responses concise but complete. Don't be overly verbose.
- If someone says hi/hello, greet them warmly and tell them what you can help with.
- NEVER fabricate data. Only use what's in the CONTEXT DATA below.
- If data isn't available, say so naturally and suggest contacting HR.

CONTEXT DATA (use ONLY this data):
${JSON.stringify(contextData, null, 2)}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  return { content: response.choices[0].message.content, type: 'text' };
}

// ──────── FALLBACK: Rule-based engine ──────── //

function fmtAED(val) {
  return val != null ? `AED ${val.toLocaleString()}` : '—';
}

async function ruleBasedResponse(message, user, contextData) {
  const msg = message.toLowerCase();
  const { role, employeeCode, department, firstName } = user;

  // Greeting
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(msg)) {
    return {
      content: `Hello ${firstName}! 👋 I'm **Veda**, your HR Concierge at ARM Holding.\n\nI can help you with:\n\n- **Leave Balance** — Check your remaining leaves\n- **Salary & Payslip** — View your compensation details\n- **Company Policies** — Browse and download policy documents\n- **Team Info** — ${role === 'employee' ? 'Find your manager details' : 'View your team members'}\n- **Benefits** — Check your enrolled benefits\n- **Documents** — Access your HR documents\n\nJust ask me anything naturally!`,
      type: 'text',
    };
  }

  // Access denied
  if (contextData.accessDenied) {
    return {
      content: `Sorry ${firstName}, you don't have permission to access information for employee **${contextData.deniedTarget}**. ${role === 'employee' ? 'You can only view your own records.' : `You can only access data for your department (**${department}**).`}\n\nIs there anything else I can help you with?`,
      type: 'text',
    };
  }

  // Employee not found
  if (contextData.employeeNotFound) {
    return { content: `I couldn't find an employee with code **${contextData.employeeNotFound}** in our system. Could you double-check the code?`, type: 'text' };
  }

  // Specific employee lookup
  if (contextData.targetEmployee) {
    const t = contextData.targetEmployee;
    if (/leave|balance/.test(msg)) {
      const entitlement = t.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `Here's the leave balance for **${t.firstName} ${t.lastName}** (${t.employeeCode}):\n\n- **Annual Leave:** ${t.leaveBalance?.annual} days available (out of ${entitlement})\n- **Sick Leave:** ${t.leaveBalance?.sick} days available (out of 90)\n- **Compensatory Off:** ${t.leaveBalance?.compensatoryOff || 0} days\n- **Total Available:** ${t.leaveBalance?.total} days`,
        type: 'text',
      };
    }
    if (/salary|pay/.test(msg)) {
      return {
        content: `Here's the salary breakdown for **${t.firstName} ${t.lastName}** (${t.employeeCode}):\n\n- **Basic Salary:** ${fmtAED(t.salary?.basic)}\n- **Living Allowance:** ${fmtAED(t.salary?.livingAllowance)}\n- **Mobile Allowance:** ${fmtAED(t.salary?.mobileAllowance)}\n- **Gross / Net Pay:** ${fmtAED(t.salary?.gross)}\n\n_No tax deductions — UAE is a tax-free jurisdiction._`,
        type: 'text',
      };
    }
    return {
      content: `Here are the details for **${t.firstName} ${t.lastName}**:\n\n- **Employee Code:** ${t.employeeCode}\n- **Department:** ${t.department}\n- **Designation:** ${t.designation}\n- **Region:** ${t.region}\n- **Legal Entity:** ${t.legalEntity}\n- **Email:** ${t.email}\n- **Phone:** ${t.phone}\n- **Joining Date:** ${new Date(t.dateOfJoining).toLocaleDateString()}\n- **Status:** ${t.status}`,
      type: 'text',
    };
  }

  // Leave balance
  if (/leave|balance|vacation|pto|annual/.test(msg)) {
    if (contextData.teamLeaves) {
      const header = role === 'hr_head' ? 'all employees' : `your team in **${department}**`;
      let md = `Here's the leave balance for ${header}:\n\n| Name | Code | Annual | Sick | Comp. Off | Total |\n|---|---|---|---|---|---|\n`;
      contextData.teamLeaves.forEach(e => {
        md += `| ${e.firstName} ${e.lastName} | ${e.employeeCode} | ${e.leaveBalance?.annual} | ${e.leaveBalance?.sick} | ${e.leaveBalance?.compensatoryOff || 0} | ${e.leaveBalance?.total} |\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    if (contextData.self) {
      const s = contextData.self;
      const entitlement = s.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `Hi ${firstName}! Here's your current leave balance:\n\n- **Annual Leave:** ${s.leaveBalance?.annual} days available (out of ${entitlement})\n- **Sick Leave:** ${s.leaveBalance?.sick} days available (out of 90)\n- **Compensatory Off:** ${s.leaveBalance?.compensatoryOff || 0} days\n- **Total Available:** ${s.leaveBalance?.total} days\n\nNeed to apply for leave? Please reach out to your manager or HR.`,
        type: 'text',
      };
    }
  }

  // Salary
  if (/salary|payslip|pay|compensation|ctc|allowance/.test(msg)) {
    const s = contextData.self;
    if (s) {
      let md = `Hi ${firstName}! Here's your salary breakdown:\n\n- **Basic Salary:** ${fmtAED(s.salary?.basic)}\n- **Living Allowance:** ${fmtAED(s.salary?.livingAllowance)}\n- **Mobile Allowance:** ${fmtAED(s.salary?.mobileAllowance)}\n- **Gross / Net Pay:** ${fmtAED(s.salary?.gross)}\n\n_UAE has no personal income tax, so your gross = net pay._`;
      if (contextData.payslips?.length) {
        md += `\n\n**Your Payslip Documents:**\n`;
        contextData.payslips.forEach((d, i) => {
          md += `${i + 1}. [${d.title}](${d.fileUrl})\n`;
        });
      }
      return { content: md.trim(), type: 'text' };
    }
  }

  // Policies
  if (/policy|policies|handbook|guideline|paternity|maternity|remote.?work|grievance/.test(msg)) {
    if (contextData.policies?.length) {
      let md = `Here are the company policy documents available for download:\n\n`;
      contextData.policies.forEach((p, i) => {
        md += `${i + 1}. **${p.title}**`;
        if (p.description) md += ` — ${p.description}`;
        if (p.fileUrl) md += `\n   [📥 Download](${p.fileUrl})`;
        md += `\n`;
      });
      md += `\nLet me know if you'd like details about any specific policy!`;
      return { content: md.trim(), type: 'text' };
    }
    return { content: 'No policy documents are currently available. Please contact HR for assistance.', type: 'text' };
  }

  // Team / all employees
  if (/team|report|direct|headcount|member|staff|employee|show all/.test(msg)) {
    if (role === 'employee') {
      return { content: `Sorry ${firstName}, you don't have permission to view team information. You can only access your own records.\n\nWould you like to check your leave balance, salary, or documents instead?`, type: 'text' };
    }
    const team = contextData.allEmployees || contextData.teamMembers;
    if (team) {
      const header = role === 'hr_head' ? `all ${team.length} employees` : `your team in **${department}** (${team.length} members)`;
      let md = `Here are ${header}:\n\n| Code | Name | Designation | Department | Status |\n|---|---|---|---|---|\n`;
      team.forEach(e => {
        md += `| ${e.employeeCode} | ${e.firstName} ${e.lastName} | ${e.designation} | ${e.department} | ${e.status} |\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
  }

  // Manager
  if (/manager|reporting|supervisor|boss/.test(msg)) {
    const s = contextData.self;
    if (s?.reportingManager) {
      const mgr = await Employee.findOne({ employeeCode: s.reportingManager });
      if (mgr) {
        return {
          content: `Your reporting manager is **${mgr.firstName} ${mgr.lastName}**.\n\n- **Employee Code:** ${mgr.employeeCode}\n- **Designation:** ${mgr.designation}\n- **Department:** ${mgr.department}\n- **Email:** ${mgr.email}\n- **Phone:** ${mgr.phone}`,
          type: 'text',
        };
      }
    }
    return { content: `Hi ${firstName}! No reporting manager is currently assigned to you in the system. Please contact HR for assistance.`, type: 'text' };
  }

  // Benefits
  if (/benefit|insurance|perk|ticket|air.?ticket|education|child/.test(msg)) {
    if (contextData.benefitsSummary) {
      let md = `Here's the company-wide benefits enrollment summary:\n\n| Benefit | Employees Enrolled |\n|---|---|\n`;
      Object.entries(contextData.benefitsSummary).forEach(([b, c]) => {
        md += `| ${b} | ${c} |\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    if (contextData.self?.benefits?.length) {
      return {
        content: `Hi ${firstName}! You're currently enrolled in the following benefits:\n\n${contextData.self.benefits.map(b => `- **${b}**`).join('\n')}\n\nFor questions about your benefits, feel free to reach out to HR.`,
        type: 'text',
      };
    }
    return { content: `Hi ${firstName}! No benefits are currently enrolled for your profile. Please contact HR for more information.`, type: 'text' };
  }

  // Documents
  if (/document|letter|contract|appraisal|proof|certificate|tax|appointment/.test(msg)) {
    if (contextData.documents?.length) {
      let md = `Here are your accessible documents:\n\n`;
      contextData.documents.forEach((d, i) => {
        md += `${i + 1}. **${d.title}** (${d.type})`;
        if (d.description) md += ` — ${d.description}`;
        if (d.fileUrl) md += `\n   [📥 Download](${d.fileUrl})`;
        md += `\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    return { content: 'No documents found for your profile. Please contact HR if you believe this is an error.', type: 'text' };
  }

  // Department overview
  if (contextData.departmentStats) {
    if (role === 'manager') {
      const myDept = contextData.departmentStats.find(d => d.name === department);
      if (myDept) {
        return {
          content: `Here's an overview of your department:\n\n- **Department:** ${myDept.name}\n- **Manager:** ${myDept.managerName}\n- **Region:** ${myDept.region}\n- **Headcount:** ${myDept.employeeCount} employees`,
          type: 'text',
        };
      }
    }
    let md = `Here's the department overview for ARM Holding:\n\n| Department | Manager | Region | Headcount |\n|---|---|---|---|\n`;
    contextData.departmentStats.forEach(d => {
      md += `| ${d.name} | ${d.managerName || d.managerId} | ${d.region} | ${d.employeeCount} |\n`;
    });
    return { content: md.trim(), type: 'text' };
  }

  // Help
  if (/help|what can you|how|assist/.test(msg)) {
    return {
      content: `Hi ${firstName}! I'm **Veda**, your HR Concierge. Here's what I can help with:\n\n- **"What is my leave balance?"** — Check your remaining leaves\n- **"Show my payslip"** — View salary and download payslips\n- **"Company policies"** — Browse and download policy documents\n- **"Who is my manager?"** — View reporting manager info\n- **"My benefits"** — Check enrolled benefits\n- **"My documents"** — Access your HR documents${role !== 'employee' ? '\n- **"Show my team"** — View your team members' : ''}\n\nJust type naturally — I understand conversational queries!`,
      type: 'text',
    };
  }

  return {
    content: `I'm not sure I understood that, ${firstName}. I can help you with things like:\n\n- Leave balance\n- Salary and payslips\n- Company policies\n- Benefits\n- Documents\n- Team information\n\nCould you try rephrasing your question?`,
    type: 'text',
  };
}

module.exports = { processMessage };
