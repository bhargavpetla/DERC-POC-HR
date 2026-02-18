# NSOffice.AI — Client Demo Walkthrough

> **Objective:** Walk the client through the full NSOffice.AI platform capabilities — starting with the HR Head's admin view, then the Manager experience, and finally the Employee self-service. Each section includes the exact prompts to type and what to narrate.

---

## Pre-Demo Setup

```bash
npm run seed    # Populate fresh data
npm run dev     # Start both server + client
```

Open **http://localhost:5173** — you should see the login page.

**Password for ALL users:** `nsoffice123`

---

## PART 1: HR HEAD VIEW (Login: 11181)

> **Narration:** "Let me first show you the full HR admin experience. I'll login as Ethan Garcia, the HR Director who has complete access to the platform."

### Step 1: Login

- Click **Ethan Garcia (HR Head)** from the demo credentials panel
- Click **Sign In**
- You land on the **Chatbot** — the everyday interface

### Step 2: Chatbot — HR Head Capabilities

> **Narration:** "This is Veda — the AI HR concierge. As HR Director, Ethan can query anything across the entire organization. Let me show you."

Type these prompts one by one, pausing to narrate:

**Prompt 1:** `Hi`
> Shows the greeting with all capabilities. Point out: "The assistant recognizes who's logged in and adapts."

**Prompt 2:** `Show all employees`
> Full table of all 22 employees. **Narrate:** "Ethan can see every employee across every department — Administration, HR, Finance, Government Relations. This is real data pulled from your MongoDB database."

**Prompt 3:** `Show department overview`
> Department table with managers and headcount. **Narrate:** "At a glance, Ethan sees all 5 departments, who manages each, and the headcount."

**Prompt 4:** `Show 11188's salary details`
> Amelia Gonzalez's full salary breakdown in AED. **Narrate:** "He can drill into any specific employee. Notice the salary structure — Basic + Living Allowance + Mobile Allowance. Everything in AED, no tax since we're in UAE."

**Prompt 5:** `Show team leave balance`
> All 22 employees' leave balances. **Narrate:** "Full visibility across the org — Annual leave, Sick leave, Compensatory Off for every employee."

**Prompt 6:** `Show company policies`
> List of all 10 policy documents with download links. **Narrate:** "All company policies are accessible and downloadable — Leave, Travel, Paternity, Maternity, Remote Work, Grievance Redressal, and more. Each one is a real PDF."

**Prompt 7:** `What is the paternity leave policy?`
> Shows the paternity leave policy specifically. **Narrate:** "Employees can ask about any specific policy and get the document instantly."

**Prompt 8:** `Show company benefits summary`
> Benefits enrollment table. **Narrate:** "Organization-wide benefits analysis — how many employees have Air Ticket, Child Education, etc."

### Step 3: HRMS Dashboard

> **Narration:** "Now let me show you the full HR Management System. Notice this 'HR Database' button in the sidebar — this is ONLY visible to the HR Head. No other role can even see it."

- Click **HR Database** in the sidebar

**Dashboard Tab:**
> **Narrate:** "Overview of the entire organization — total headcount, department breakdown, key metrics."

**Employees Tab:**
> **Narrate:** "Full employee directory with search and filters."
- Click the **Department** filter → select **Finance & Support Services**
> "Filtered to show only Finance team — 10 employees."
- Click on **Amelia Gonzalez** row
> "Detailed employee profile — personal info, compensation in AED, leave balance with visual bars, documents."
- Click the **Compensation** tab in the detail panel
> "Full salary breakdown — Basic, Living Allowance, Mobile Allowance, Gross. No tax deductions since UAE."
- Click the **Leaves** tab
> "Visual leave balance — Annual leave, Sick leave, Compensatory Off with progress bars."
- Click the **Documents** tab
> "All documents tagged to this employee — offer letter, payslip. Click to download the actual PDF."

**Documents Tab:**
> **Narrate:** "Document management system."
- Filter by **Type: Policy**
> "All 10 organization-wide policies."

**Add Employee:**
> **Narrate:** "HR can add new employees directly. The system auto-generates the next employee code."
- Show the form (don't submit)
> "Department, designation, salary structure, legal entity — all configured. On submit, it creates the employee record AND the login account automatically."

- Click **Back to Chat** to return

---

## PART 2: MANAGER VIEW (Login: 11177)

> **Narration:** "Now let me show you what a Department Manager sees. I'll login as Liam Johnson, Senior Manager of Administration. Notice — his experience is completely different from the HR Head."

### Step 1: Login

- Click **Logout** (bottom-left of sidebar)
- Login with **11177** / `nsoffice123`

### Step 2: Point out what's different

> **Narrate:** "First thing to notice — there is NO 'HR Database' button in the sidebar. Managers cannot access the HRMS dashboard at all. They only interact through the chatbot."

### Step 3: Chatbot — Manager Capabilities

**Prompt 1:** `Show my team's leave balance`
> Shows leave balance for Administration only (Olivia, Ava, Noah). **Narrate:** "Liam can see his team's leave — but ONLY his department. He has 3 people reporting to him."

**Prompt 2:** `Who are my direct reports?`
> Table of Administration team. **Narrate:** "He sees his direct reports with their designations and status."

**Prompt 3:** `Show 11176's details`
> Olivia Smith's full profile. **Narrate:** "He can look up any employee in his department."

**Prompt 4:** `Show 11185's salary`
> **ACCESS DENIED.** **Narrate:** "But watch what happens when he tries to access someone from Finance — Lucas Martinez. Access denied. The system enforces department boundaries automatically."

**Prompt 5:** `What is my salary?`
> Liam's salary: AED 24,000 gross. **Narrate:** "He can always see his own data."

**Prompt 6:** `Show company policies`
> All 10 policies. **Narrate:** "Company-wide policies are accessible to everyone — regardless of role."

**Prompt 7:** `What is the remote work policy?`
> Remote work policy document. **Narrate:** "He can access any specific policy document."

---

## PART 3: EMPLOYEE VIEW (Login: 11176)

> **Narration:** "Finally, let's see the Employee self-service experience. I'll login as Olivia Smith, an Assistant in Administration. This is the most restricted view."

### Step 1: Login

- Click **Logout**
- Login with **11176** / `nsoffice123`

### Step 2: Point out what's different

> **Narrate:** "No HR Database button. The employee only has the chatbot — their personal HR assistant."

### Step 3: Chatbot — Employee Capabilities

**Prompt 1:** `Hi`
> Greeting. **Narrate:** "Veda greets Olivia by name and shows what she can do."

**Prompt 2:** `What is my leave balance?`
> Table: Annual: 25, Sick: 5, Comp. Off: 0. **Narrate:** "She can check her own leave balance anytime. Notice — Annual leave entitlement is 35 days because she's under the PRIVATE entity."

**Prompt 3:** `Show my payslip`
> Salary table (AED 7,500) + payslip PDF link. **Narrate:** "Full salary breakdown and she can download her actual payslip PDF."

**Prompt 4:** `What are my benefits?`
> Air Ticket. **Narrate:** "She sees her enrolled benefits."

**Prompt 5:** `Who is my manager?`
> Liam Johnson with contact details. **Narrate:** "She can look up her reporting manager's info."

**Prompt 6:** `Show my documents`
> Offer letter + payslip. **Narrate:** "All her personal documents — offer letter, payslips. Each one is downloadable."

**Prompt 7:** `Show 11185's salary`
> **ACCESS DENIED — "You can only view your own records."** **Narrate:** "This is the key security feature — Olivia CANNOT see anyone else's data. Not salary, not leave, not documents. The system strictly enforces this."

**Prompt 8:** `Show team leave balance`
> **ACCESS DENIED — No permission for team info.** **Narrate:** "She can't see team data either. Only managers and HR can."

**Prompt 9:** `What is the maternity leave policy?`
> Maternity leave policy document. **Narrate:** "But she CAN access company-wide policies. 60 days maternity leave — 45 full pay + 15 half pay, per UAE law."

---

## CLOSING SUMMARY

> **Narration:** "So to recap what you've seen:"

| Capability | Employee | Manager | HR Head |
|-----------|----------|---------|---------|
| Own leave/salary/documents | Yes | Yes | Yes |
| Team data | No | Own department only | All departments |
| Other dept data | No | No | Yes |
| Company policies | Yes | Yes | Yes |
| HRMS Dashboard | Not visible | Not visible | Full access |
| Add employees | No | No | Yes |
| Download payslips/documents | Own only | Dept only | All |

> "Everything is role-based, real-time, and powered by AI. The chatbot understands natural language, enforces security automatically, and serves actual documents from the system. This is your employees' single window to HR."

---

## Quick Reference: All Login Codes

| Code | Name | Role | Department |
|------|------|------|------------|
| **11181** | Ethan Garcia | **HR Head** | Human Resources |
| **11177** | Liam Johnson | Manager | Administration |
| **11182** | Isabella Miller | Manager | Human Resources |
| **11188** | Amelia Gonzalez | Manager | Finance & Support Services |
| **11189** | James Wilson | Manager | Finance & Support Services |
| **11197** | Henry Perez | Manager | Government Relations |
| **11176** | Olivia Smith | Employee | Administration |
| 11178 | Ava Williams | Employee | Administration |
| 11179 | Noah Brown | Employee | Administration |
| 11180 | Sophia Jones | Employee | Human Resources |
| 11183 | Mason Davis | Employee | Human Resources |
| 11184 | Mia Rodriguez | Employee | Human Resources |
| 11185-11194 | (10 employees) | Employee | Finance & Support Services |
| 11195-11196 | Daniel Martin, Emily Lee | Employee | Government Relations |

**Password for all:** `nsoffice123`
