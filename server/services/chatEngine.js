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
LEAVE STRUCTURE: Annual Leave (30 or 35 days/year based on entity), Sick Leave (up to 90 days/year), Compensatory Off.

RESPONSE FORMAT — CRITICAL RULES:
- Respond in clean, well-formatted **Markdown**.
- Use **bold** for labels and important values.
- Use markdown tables (| col1 | col2 |) for tabular data — always include header separator (|---|---|).
- Use bullet points (- item) for lists.
- Use ### for section headings when needed.
- For currency, always prefix with "AED".
- Keep responses conversational, concise, and well-structured.
- When showing documents/policies with download links, format as a numbered list with the document name as a markdown link: [Document Name](url)
- Do NOT make up data. Only use the CONTEXT DATA provided below.
- If data is not available in context, say you don't have that information and suggest they contact HR.

CONTEXT DATA (only use this data, do not fabricate):
${JSON.stringify(contextData, null, 2)}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: message }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2000,
    },
  });

  const responseText = result.response.text();
  return { content: responseText, type: 'text' };
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
      content: `Hello ${firstName}! 👋 I'm **Veda**, your HR Concierge.\n\nHere's what I can help you with:\n\n- **Leave Balance** — Check your remaining leaves\n- **Payslip & Salary** — View compensation details\n- **HR Policies** — Browse company policies\n- **Team Info** — ${role === 'employee' ? 'View your manager info' : 'View your team details'}\n- **Benefits** — Check your enrolled benefits\n- **Documents** — Access your documents\n\nJust type naturally — how can I help you today?`,
      type: 'text',
    };
  }

  // Access denied
  if (contextData.accessDenied) {
    return {
      content: `⚠️ **Access Denied**\n\nSorry ${firstName}, you don't have permission to view information for employee **${contextData.deniedTarget}**.\n\n${role === 'employee' ? 'As an employee, you can only view your own records.' : `As a manager, you can only view information for your department (**${department}**).`}`,
      type: 'text',
    };
  }

  // Employee not found
  if (contextData.employeeNotFound) {
    return { content: `Employee **${contextData.employeeNotFound}** was not found in the system. Please check the employee code and try again.`, type: 'text' };
  }

  // Specific employee lookup
  if (contextData.targetEmployee) {
    const t = contextData.targetEmployee;
    if (/leave|balance/.test(msg)) {
      const entitlement = t.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `### Leave Balance — ${t.firstName} ${t.lastName} (${t.employeeCode})\n\n| Leave Type | Available | Entitlement |\n|---|---|---|\n| Annual | ${t.leaveBalance?.annual} | ${entitlement} |\n| Sick | ${t.leaveBalance?.sick} | 90 |\n| Comp. Off | ${t.leaveBalance?.compensatoryOff || 0} | — |\n| **Total** | **${t.leaveBalance?.total}** | |`,
        type: 'text',
      };
    }
    if (/salary|pay/.test(msg)) {
      return {
        content: `### Salary Details — ${t.firstName} ${t.lastName} (${t.employeeCode})\n\n| Component | Amount |\n|---|---|\n| Basic Salary | ${fmtAED(t.salary?.basic)} |\n| Living Allowance | ${fmtAED(t.salary?.livingAllowance)} |\n| Mobile Allowance | ${fmtAED(t.salary?.mobileAllowance)} |\n| **Gross / Net Pay** | **${fmtAED(t.salary?.gross)}** |`,
        type: 'text',
      };
    }
    return {
      content: `### Employee Profile — ${t.firstName} ${t.lastName}\n\n| Field | Details |\n|---|---|\n| Employee Code | ${t.employeeCode} |\n| Department | ${t.department} |\n| Designation | ${t.designation} |\n| Region | ${t.region} |\n| Legal Entity | ${t.legalEntity} |\n| Email | ${t.email} |\n| Phone | ${t.phone} |\n| Joining Date | ${new Date(t.dateOfJoining).toLocaleDateString()} |\n| Status | ${t.status} |`,
      type: 'text',
    };
  }

  // Leave balance
  if (/leave|balance|vacation|pto|annual/.test(msg)) {
    if (contextData.teamLeaves) {
      const header = role === 'hr_head' ? 'All Employees' : `Team — ${department}`;
      let md = `### Leave Balance — ${header}\n\n| Name | Code | Annual | Sick | Comp. Off | Total |\n|---|---|---|---|---|---|\n`;
      contextData.teamLeaves.forEach(e => {
        md += `| ${e.firstName} ${e.lastName} | ${e.employeeCode} | ${e.leaveBalance?.annual} | ${e.leaveBalance?.sick} | ${e.leaveBalance?.compensatoryOff || 0} | ${e.leaveBalance?.total} |\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    if (contextData.self) {
      const s = contextData.self;
      const entitlement = s.legalEntity?.includes('PRIVATE') ? 35 : 30;
      return {
        content: `Hi ${firstName}! Here's your leave balance:\n\n| Leave Type | Available | Entitlement |\n|---|---|---|\n| Annual | ${s.leaveBalance?.annual} | ${entitlement} |\n| Sick | ${s.leaveBalance?.sick} | 90 |\n| Comp. Off | ${s.leaveBalance?.compensatoryOff || 0} | — |\n| **Total** | **${s.leaveBalance?.total}** | |`,
        type: 'text',
      };
    }
  }

  // Salary
  if (/salary|payslip|pay|compensation|ctc|allowance/.test(msg)) {
    const s = contextData.self;
    if (s) {
      let md = `Hi ${firstName}! Here's your salary breakdown:\n\n| Component | Amount |\n|---|---|\n| Basic Salary | ${fmtAED(s.salary?.basic)} |\n| Living Allowance | ${fmtAED(s.salary?.livingAllowance)} |\n| Mobile Allowance | ${fmtAED(s.salary?.mobileAllowance)} |\n| **Gross / Net Pay** | **${fmtAED(s.salary?.gross)}** |`;
      if (contextData.payslips?.length) {
        md += `\n\n**📄 Payslip Documents:**\n`;
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
      let md = `### Company Policies\n\nHere are all the available policy documents:\n\n`;
      contextData.policies.forEach((p, i) => {
        md += `${i + 1}. **${p.title}**`;
        if (p.description) md += ` — ${p.description}`;
        if (p.fileUrl) md += `\n   📥 [Download](${p.fileUrl})`;
        md += `\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    return { content: 'No policy documents are currently available. Please contact HR for assistance.', type: 'text' };
  }

  // Team / all employees
  if (/team|report|direct|headcount|member|staff|employee|show all/.test(msg)) {
    if (role === 'employee') {
      return { content: `⚠️ Sorry ${firstName}, you don't have permission to view team information. You can only access your own records.`, type: 'text' };
    }
    const team = contextData.allEmployees || contextData.teamMembers;
    if (team) {
      const header = role === 'hr_head' ? `All Employees (${team.length})` : `Your Team — ${department} (${team.length})`;
      let md = `### ${header}\n\n| Code | Name | Designation | Department | Status |\n|---|---|---|---|---|\n`;
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
          content: `Your reporting manager is:\n\n| Field | Details |\n|---|---|\n| Name | **${mgr.firstName} ${mgr.lastName}** |\n| Employee Code | ${mgr.employeeCode} |\n| Designation | ${mgr.designation} |\n| Department | ${mgr.department} |\n| Email | ${mgr.email} |\n| Phone | ${mgr.phone} |`,
          type: 'text',
        };
      }
    }
    return { content: `Hi ${firstName}! No reporting manager is currently assigned to you in the system. Please contact HR for assistance.`, type: 'text' };
  }

  // Benefits
  if (/benefit|insurance|perk|ticket|air.?ticket|education|child/.test(msg)) {
    if (contextData.benefitsSummary) {
      let md = `### Company Benefits Summary\n\n| Benefit | Employees Enrolled |\n|---|---|\n`;
      Object.entries(contextData.benefitsSummary).forEach(([b, c]) => {
        md += `| ${b} | ${c} |\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    if (contextData.self?.benefits?.length) {
      return {
        content: `Hi ${firstName}! Here are your enrolled benefits:\n\n${contextData.self.benefits.map(b => `- **${b}**`).join('\n')}`,
        type: 'text',
      };
    }
    return { content: `Hi ${firstName}! No benefits are currently enrolled for your profile. Please contact HR for more information.`, type: 'text' };
  }

  // Documents
  if (/document|letter|contract|appraisal|proof|certificate|tax|appointment/.test(msg)) {
    if (contextData.documents?.length) {
      let md = `### Your Documents\n\n`;
      contextData.documents.forEach((d, i) => {
        md += `${i + 1}. **${d.title}** (${d.type})`;
        if (d.description) md += ` — ${d.description}`;
        if (d.fileUrl) md += `\n   📥 [Download](${d.fileUrl})`;
        md += `\n`;
      });
      return { content: md.trim(), type: 'text' };
    }
    return { content: 'No documents found for your profile. Please contact HR if you think this is an error.', type: 'text' };
  }

  // Department overview
  if (contextData.departmentStats) {
    if (role === 'manager') {
      const myDept = contextData.departmentStats.find(d => d.name === department);
      if (myDept) {
        return {
          content: `### Department — ${myDept.name}\n\n| Field | Details |\n|---|---|\n| Manager | ${myDept.managerName} |\n| Region | ${myDept.region} |\n| Headcount | ${myDept.employeeCount} |`,
          type: 'text',
        };
      }
    }
    let md = `### Department Overview\n\n| Department | Manager | Region | Headcount |\n|---|---|---|---|\n`;
    contextData.departmentStats.forEach(d => {
      md += `| ${d.name} | ${d.managerName || d.managerId} | ${d.region} | ${d.employeeCount} |\n`;
    });
    return { content: md.trim(), type: 'text' };
  }

  // Help
  if (/help|what can you|how|assist/.test(msg)) {
    return {
      content: `Hi ${firstName}! I'm **Veda**, your HR Concierge. Here's what I can help with:\n\n- **"What is my leave balance?"** — Check your remaining leaves\n- **"Show my payslip"** — View salary and download payslips\n- **"Company policies"** — Browse and download policy documents\n- **"Who is my manager?"** — View reporting manager info\n- **"My benefits"** — Check enrolled benefits\n- **"My documents"** — Access your documents${role !== 'employee' ? '\n- **"Show my team"** — View your team members' : ''}\n\nJust type naturally — I understand conversational queries!`,
      type: 'text',
    };
  }

  return {
    content: `I'm sorry, I didn't quite understand that. Try asking me about:\n\n- Leave balance\n- Salary / payslip\n- Company policies\n- Benefits\n- Documents\n- Team information\n\nCould you try rephrasing your question?`,
    type: 'text',
  };
}

module.exports = { processMessage };
