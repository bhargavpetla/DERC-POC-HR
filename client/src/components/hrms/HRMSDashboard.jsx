import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FiHome, FiUsers, FiFileText, FiGrid, FiUserPlus, FiFilePlus, FiMessageCircle, FiLogOut, FiSearch, FiUser, FiChevronLeft, FiChevronRight, FiX, FiEye, FiTrash2, FiDownload, FiChevronUp, FiChevronDown, FiUpload, FiTag } from 'react-icons/fi';

export default function HRMSDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ department: '', region: '', status: '', search: '', employmentType: '' });
  const [sortBy, setSortBy] = useState('employeeCode');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [docFilters, setDocFilters] = useState({ type: '', department: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchDepartments(); }, []);
  useEffect(() => { fetchEmployees(); }, [page, limit, filters, sortBy, sortOrder]);
  useEffect(() => { fetchDocuments(); }, [docFilters]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = { page, limit, sortBy, sortOrder, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await api.get('/employees', { params });
      setEmployees(data.employees);
      setTotalEmployees(data.total);
      setTotalPages(data.pages);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchDocuments = async () => {
    try {
      const params = { ...docFilters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await api.get('/documents', { params });
      setDocuments(data);
    } catch (e) { console.error(e); }
  };

  const fetchDepartments = async () => {
    try {
      const { data } = await api.get('/departments');
      setDepartments(data);
    } catch (e) { console.error(e); }
  };

  const deleteDocument = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocuments();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Debounced search
  const searchTimeoutRef = useRef(null);
  const handleSearchChange = (value) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: value }));
      setPage(1);
    }, 300);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <FiHome size={16} /> },
    { id: 'employees', label: 'Employees', icon: <FiUsers size={16} /> },
    { id: 'documents', label: 'Documents', icon: <FiFileText size={16} /> },
    { id: 'departments', label: 'Departments', icon: <FiGrid size={16} /> },
    { id: 'addEmployee', label: 'Add Employee', icon: <FiUserPlus size={16} /> },
    { id: 'addDocument', label: 'Add Document', icon: <FiFilePlus size={16} /> },
  ];

  const regions = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai'];
  const docTypes = ['Offer Letter', 'Payslip', 'ID Proof', 'Address Proof', 'Education Certificate', 'Experience Letter', 'Appointment Letter', 'Tax Document', 'Policy', 'Appraisal', 'Contract', 'Custom'];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 'var(--sidebar-width)', background: 'var(--brand-black)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <img src="/logos/wordmark-white.png" alt="NSOffice.AI" style={{ height: '24px', objectFit: 'contain' }} />
          <div style={{ fontSize: '11px', color: 'var(--grey-2)', marginTop: '6px' }}>HR Management System</div>
        </div>
        <div style={{ padding: '12px', flex: 1 }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => { setActiveTab(item.id); if (item.id === 'employees') { setPage(1); } }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: activeTab === item.id ? '#fff' : 'var(--grey-2)', background: activeTab === item.id ? 'rgba(255,255,255,0.1)' : 'transparent', fontSize: '13px', fontWeight: activeTab === item.id ? 600 : 400, marginBottom: '2px', transition: 'var(--transition)' }}>
              {item.icon} {item.label}
            </div>
          ))}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div onClick={() => navigate('/chat')} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--accent)', fontSize: '13px' }}>
              <FiMessageCircle size={16} /> Back to Chatbot
            </div>
          </div>
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--grey-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiUser size={12} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: '10px', color: 'var(--grey-2)' }}>{user?.employeeCode}</div>
          </div>
          <button onClick={logout} style={{ background: 'none', padding: '4px', color: 'var(--grey-2)' }}><FiLogOut size={14} /></button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-secondary)', padding: '24px 32px' }}>
        {activeTab === 'dashboard' && <DashboardView departments={departments} documents={documents} totalEmployees={totalEmployees} />}
        {activeTab === 'employees' && (
          <EmployeesView employees={employees} loading={loading} filters={filters} setFilters={setFilters}
            departments={departments} regions={regions} page={page} limit={limit} setLimit={setLimit}
            totalPages={totalPages} setPage={setPage} totalEmployees={totalEmployees}
            onSelectEmployee={setSelectedEmployee} sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort}
            handleSearchChange={handleSearchChange} />
        )}
        {activeTab === 'documents' && (
          <DocumentsView documents={documents} docFilters={docFilters} setDocFilters={setDocFilters}
            departments={departments} docTypes={docTypes} onDelete={deleteDocument} />
        )}
        {activeTab === 'departments' && <DepartmentsView departments={departments} />}
        {activeTab === 'addEmployee' && <AddEmployeeForm departments={departments} regions={regions} onSuccess={() => { setActiveTab('employees'); fetchEmployees(); }} />}
        {activeTab === 'addDocument' && <AddDocumentForm departments={departments} regions={regions} docTypes={docTypes} onSuccess={() => { setActiveTab('documents'); fetchDocuments(); }} />}
      </div>

      {selectedEmployee && <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} documents={documents} />}
    </div>
  );
}

/* ─── Dashboard ─── */
function DashboardView({ departments, documents, totalEmployees }) {
  const colors = ['var(--lime-yellow)', 'var(--mint-green)', 'var(--sky-blue)', 'var(--soft-lavender)', 'var(--blush-peach)'];
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Dashboard Overview</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Total Employees', value: totalEmployees || 0, color: 'var(--sky-blue)' },
          { label: 'Departments', value: departments.length, color: 'var(--mint-green)' },
          { label: 'Documents', value: documents.length, color: 'var(--soft-lavender)' },
          { label: 'Active', value: totalEmployees || 0, color: 'var(--lime-yellow)' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${stat.color}` }}>
            <div style={{ fontSize: '12px', color: 'var(--grey-1)', fontWeight: 500 }}>{stat.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px' }}>{stat.value}</div>
          </div>
        ))}
      </div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Departments</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {departments.map((dept, i) => (
          <div key={dept.name} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{dept.name}</div>
              <span style={{ padding: '2px 10px', borderRadius: '50px', background: colors[i % 5], fontSize: '12px', fontWeight: 600 }}>{dept.employeeCount}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--grey-1)', marginTop: '6px' }}>Manager: {dept.managerName || dept.managerId}</div>
            <div style={{ fontSize: '12px', color: 'var(--grey-2)' }}>Region: {dept.region}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Employees Table ─── */
function EmployeesView({ employees, loading, filters, setFilters, departments, regions, page, limit, setLimit, totalPages, setPage, totalEmployees, onSelectEmployee, sortBy, sortOrder, handleSort, handleSearchChange }) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <FiChevronUp size={12} style={{ opacity: 0.2 }} />;
    return sortOrder === 'asc' ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />;
  };

  const sortableHeaders = [
    { key: 'employeeCode', label: 'Code' },
    { key: 'firstName', label: 'Name' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'region', label: 'Region' },
    { key: 'reportingManager', label: 'Manager' },
    { key: 'employmentType', label: 'Type' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Employees <span style={{ fontSize: '14px', color: 'var(--grey-1)', fontWeight: 400 }}>({totalEmployees})</span></h2>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <FiSearch size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--grey-2)' }} />
          <input value={searchInput} onChange={(e) => { setSearchInput(e.target.value); handleSearchChange(e.target.value); }} placeholder="Search by name, email, code..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '13px', background: '#fff' }} />
        </div>
        <select value={filters.department} onChange={(e) => { setFilters({ ...filters, department: e.target.value }); setPage(1); }} style={selectStyle}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <select value={filters.region} onChange={(e) => { setFilters({ ...filters, region: e.target.value }); setPage(1); }} style={selectStyle}>
          <option value="">All Regions</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} style={selectStyle}>
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="On Leave">On Leave</option>
        </select>
        <select value={filters.employmentType} onChange={(e) => { setFilters({ ...filters, employmentType: e.target.value }); setPage(1); }} style={selectStyle}>
          <option value="">All Types</option>
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Contract">Contract</option>
          <option value="Intern">Intern</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                {sortableHeaders.map(h => (
                  <th key={h.key} onClick={() => handleSort(h.key)} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{h.label} <SortIcon field={h.key} /></span>
                  </th>
                ))}
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={9} style={{ padding: '16px' }}><div style={{ height: '16px', background: 'var(--bg-secondary)', borderRadius: '4px', animation: 'pulse 1.5s ease infinite' }} /></td></tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-2)' }}>No employees found</td></tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.employeeCode} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'var(--transition)' }}
                    onClick={() => onSelectEmployee(emp)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={tdStyle}><strong>{emp.employeeCode}</strong></td>
                    <td style={tdStyle}>{emp.firstName} {emp.lastName}</td>
                    <td style={tdStyle}>{emp.department}</td>
                    <td style={tdStyle}>{emp.designation}</td>
                    <td style={tdStyle}>{emp.region}</td>
                    <td style={tdStyle}>{emp.reportingManager || '—'}</td>
                    <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500, background: emp.employmentType === 'Contract' ? 'var(--blush-peach)' : 'var(--bg-secondary)' }}>{emp.employmentType || 'Full-Time'}</span></td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, background: emp.status === 'Active' ? 'var(--mint-green)' : emp.status === 'On Leave' ? 'var(--lime-yellow)' : 'var(--blush-peach)' }}>{emp.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <button onClick={(e) => { e.stopPropagation(); onSelectEmployee(emp); }} style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', color: 'var(--accent)' }}><FiEye size={14} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--grey-1)' }}>
            <span>Rows per page:</span>
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} style={{ ...selectStyle, minWidth: '70px', padding: '6px 8px' }}>
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span style={{ marginLeft: '8px' }}>Total: {totalEmployees}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={paginationBtn}><FiChevronLeft size={16} /></button>
            <span style={{ fontSize: '13px', color: 'var(--grey-1)' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={paginationBtn}><FiChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Documents ─── */
function DocumentsView({ documents, docFilters, setDocFilters, departments, docTypes, onDelete }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Documents <span style={{ fontSize: '14px', color: 'var(--grey-1)', fontWeight: 400 }}>({documents.length})</span></h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select value={docFilters.type} onChange={(e) => setDocFilters({ ...docFilters, type: e.target.value })} style={selectStyle}>
          <option value="">All Types</option>
          {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={docFilters.department} onChange={(e) => setDocFilters({ ...docFilters, department: e.target.value })} style={selectStyle}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Title', 'Type', 'Department', 'Tagged Employees', 'Tags', 'Date', 'Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--grey-2)' }}>No documents found</td></tr>
            ) : documents.map(doc => (
              <tr key={doc._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={tdStyle}>{doc.title}</td>
                <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: typeColor(doc.type) }}>{doc.type}{doc.customType ? `: ${doc.customType}` : ''}</span></td>
                <td style={tdStyle}>{doc.department || '—'}</td>
                <td style={tdStyle}><span style={{ fontSize: '12px', color: 'var(--grey-1)' }}>{doc.taggedEmployees?.join(', ') || '—'}</span></td>
                <td style={tdStyle}>
                  {doc.tags?.map((tag, i) => (
                    <span key={i} style={{ display: 'inline-block', margin: '1px 2px', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', background: 'var(--soft-lavender)', fontWeight: 500 }}>{tag}</span>
                  ))}
                </td>
                <td style={tdStyle}>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '4px', color: 'var(--accent)', display: 'inline-flex' }}><FiDownload size={14} /></a>}
                    <button onClick={() => onDelete(doc._id)} style={{ background: 'var(--blush-peach)', padding: '4px 8px', borderRadius: '4px', color: '#dc2626' }}><FiTrash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Departments ─── */
function DepartmentsView({ departments }) {
  const colors = ['var(--lime-yellow)', 'var(--mint-green)', 'var(--sky-blue)', 'var(--soft-lavender)', 'var(--blush-peach)'];
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Departments</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {departments.map((dept, i) => (
          <div key={dept.name} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', borderTop: `3px solid ${colors[i % 5]}` }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{dept.name}</h3>
            <div style={{ fontSize: '13px', color: 'var(--grey-1)', lineHeight: 2 }}>
              <div><strong>Manager:</strong> {dept.managerName} ({dept.managerId})</div>
              <div><strong>Region:</strong> {dept.region}</div>
              <div><strong>Legal Entity:</strong> {dept.legalEntity}</div>
              <div><strong>Headcount:</strong> <span style={{ padding: '1px 8px', borderRadius: '50px', background: colors[i % 5], fontWeight: 600 }}>{dept.employeeCount}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Add Employee Form ─── */
function AddEmployeeForm({ departments, regions, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', department: '', designation: '',
    region: '', dateOfJoining: '', dateOfBirth: '', employmentType: 'Full-Time',
    legalEntity: 'ARM Holding - CAPRI',
    salary: { basic: '', livingAllowance: '', mobileAllowance: '' }, benefits: ['Air Ticket'],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const basic = Number(form.salary.basic);
      const livingAllowance = Number(form.salary.livingAllowance);
      const mobileAllowance = Number(form.salary.mobileAllowance);
      const gross = basic + livingAllowance + mobileAllowance;
      const salary = { basic, livingAllowance, mobileAllowance, gross, deductions: { pf: 0, professionalTax: 0, tds: 0 }, netPay: gross };
      const mgr = departments.find(d => d.name === form.department)?.managerId || '';
      await api.post('/employees', {
        ...form, salary, reportingManager: mgr, status: 'Active',
        leaveBalance: { annual: 30, sick: 5, compensatoryOff: 0, total: 35 },
        leaveHistory: [],
      });
      toast.success('Employee added successfully!');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add employee');
    }
    setSubmitting(false);
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Add New Employee</h2>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '32px', boxShadow: 'var(--shadow-sm)', maxWidth: '800px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--grey-1)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Personal Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <FormField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} required />
          <FormField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} required />
          <FormField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
          <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+91-9876543210" />
          <FormField label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} />
        </div>

        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--grey-1)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Employment Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Department *</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={inputStyle} required>
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <FormField label="Designation" value={form.designation} onChange={(v) => setForm({ ...form, designation: v })} required />
          <div>
            <label style={labelStyle}>Region *</label>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} style={inputStyle} required>
              <option value="">Select Region</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <FormField label="Date of Joining" type="date" value={form.dateOfJoining} onChange={(v) => setForm({ ...form, dateOfJoining: v })} required />
          <div>
            <label style={labelStyle}>Employment Type</label>
            <select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} style={inputStyle}>
              <option value="Full-Time">Full-Time</option>
              <option value="Part-Time">Part-Time</option>
              <option value="Contract">Contract</option>
              <option value="Intern">Intern</option>
            </select>
          </div>
          <FormField label="Legal Entity" value={form.legalEntity} onChange={(v) => setForm({ ...form, legalEntity: v })} />
        </div>

        <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--grey-1)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Compensation</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <FormField label="Basic Salary (AED)" type="number" value={form.salary.basic} onChange={(v) => setForm({ ...form, salary: { ...form.salary, basic: v } })} required />
          <FormField label="Living Allowance (AED)" type="number" value={form.salary.livingAllowance} onChange={(v) => setForm({ ...form, salary: { ...form.salary, livingAllowance: v } })} required />
          <FormField label="Mobile Allowance (AED)" type="number" value={form.salary.mobileAllowance} onChange={(v) => setForm({ ...form, salary: { ...form.salary, mobileAllowance: v } })} required />
        </div>

        <button type="submit" disabled={submitting} style={{ padding: '12px 32px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Adding...' : 'Add Employee'}
        </button>
      </form>
    </div>
  );
}

/* ─── Add Document Form ─── */
function AddDocumentForm({ departments, regions, docTypes, onSuccess }) {
  const [form, setForm] = useState({ title: '', type: '', customType: '', department: '', region: '', taggedEmployees: '', tags: '', accessLevel: 'employee', description: '' });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('type', form.type);
      if (form.customType) formData.append('customType', form.customType);
      formData.append('department', form.department);
      formData.append('region', form.region);
      formData.append('taggedEmployees', JSON.stringify(form.taggedEmployees ? form.taggedEmployees.split(',').map(s => s.trim()) : []));
      formData.append('taggedDepartments', JSON.stringify(form.department ? [form.department] : []));
      formData.append('accessLevel', form.accessLevel);
      formData.append('description', form.description);
      if (form.tags) formData.append('tags', JSON.stringify(form.tags.split(',').map(s => s.trim())));
      if (file) formData.append('file', file);

      await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document added successfully!');
      onSuccess();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add document');
    }
    setSubmitting(false);
  };

  return (
    <div className="fade-in">
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px' }}>Add New Document</h2>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: '32px', boxShadow: 'var(--shadow-sm)', maxWidth: '800px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <FormField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <div>
            <label style={labelStyle}>Type *</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle} required>
              <option value="">Select Type</option>
              {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {form.type === 'Custom' && (
            <FormField label="Custom Type Name" value={form.customType} onChange={(v) => setForm({ ...form, customType: v })} required placeholder="e.g. NDA, Visa Document" />
          )}
          <div>
            <label style={labelStyle}>Department</label>
            <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} style={inputStyle}>
              <option value="">Select Department</option>
              <option value="All">All Departments</option>
              {departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Region</label>
            <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} style={inputStyle}>
              <option value="">Select Region</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <FormField label="Tagged Employees" value={form.taggedEmployees} onChange={(v) => setForm({ ...form, taggedEmployees: v })} placeholder="EMP001, EMP002 (comma-separated)" />
          <div>
            <label style={labelStyle}>Access Level *</label>
            <select value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })} style={inputStyle}>
              <option value="employee">Employee (tagged only)</option>
              <option value="department">Department</option>
              <option value="organization">Organization (everyone)</option>
            </select>
          </div>
          <FormField label="Custom Tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="e.g. Q1-2025, Urgent, Confidential" />
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>File Upload</label>
            <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} id="fileUpload" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
              <label htmlFor="fileUpload" style={{ cursor: 'pointer', color: 'var(--grey-1)' }}>
                <FiUpload size={24} style={{ display: 'block', margin: '0 auto 8px' }} />
                {file ? <span style={{ fontWeight: 500 }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span> : <span>Click to upload PDF, DOC, DOCX, or images</span>}
              </label>
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </div>
        <button type="submit" disabled={submitting} style={{ marginTop: '24px', padding: '12px 32px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600, opacity: submitting ? 0.7 : 1 }}>
          {submitting ? 'Uploading...' : 'Add Document'}
        </button>
      </form>
    </div>
  );
}

/* ─── Employee Detail Modal ─── */
function EmployeeDetailModal({ employee, onClose, documents }) {
  const [activeDetailTab, setActiveDetailTab] = useState('profile');
  const empDocs = documents.filter(d => d.taggedEmployees?.includes(employee.employeeCode));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="slide-in"
        style={{ width: '520px', height: '100%', background: '#fff', overflow: 'auto', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', background: 'var(--brand-black)', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--sky-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700, color: 'var(--brand-black)' }}>
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{employee.firstName} {employee.lastName}</h3>
                <p style={{ fontSize: '13px', color: 'var(--grey-3)', marginTop: '2px' }}>{employee.employeeCode} &middot; {employee.designation}</p>
                <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 10px', borderRadius: '50px', fontSize: '11px', fontWeight: 600, background: employee.status === 'Active' ? 'var(--mint-green)' : employee.status === 'On Leave' ? 'var(--lime-yellow)' : 'var(--blush-peach)', color: 'var(--brand-black)' }}>{employee.status}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', color: '#fff' }}><FiX size={18} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 32px' }}>
          {['profile', 'employment', 'compensation', 'leaves', 'documents'].map(tab => (
            <button key={tab} onClick={() => setActiveDetailTab(tab)}
              style={{ padding: '12px 16px', background: 'none', fontSize: '13px', fontWeight: activeDetailTab === tab ? 600 : 400, color: activeDetailTab === tab ? 'var(--accent)' : 'var(--grey-1)', borderBottom: activeDetailTab === tab ? '2px solid var(--accent)' : '2px solid transparent', transition: 'var(--transition)', textTransform: 'capitalize' }}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 32px' }}>
          {activeDetailTab === 'profile' && (
            <div className="fade-in">
              <Section title="Personal Information">
                <InfoRow label="Full Name" value={`${employee.firstName} ${employee.lastName}`} />
                <InfoRow label="Employee Code" value={employee.employeeCode} />
                <InfoRow label="Email" value={employee.email} />
                <InfoRow label="Phone" value={employee.phone || '—'} />
                <InfoRow label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : '—'} />
              </Section>
              <Section title="Benefits">
                {employee.benefits?.map(b => (
                  <span key={b} style={{ display: 'inline-block', margin: '4px 4px 0 0', padding: '4px 12px', borderRadius: '50px', fontSize: '11px', background: 'var(--soft-lavender)', fontWeight: 500 }}>{b}</span>
                ))}
              </Section>
            </div>
          )}

          {activeDetailTab === 'employment' && (
            <div className="fade-in">
              <Section title="Employment Details">
                <InfoRow label="Department" value={employee.department} />
                <InfoRow label="Designation" value={employee.designation} />
                <InfoRow label="Region" value={employee.region} />
                <InfoRow label="Reporting Manager" value={employee.reportingManager || '—'} />
                <InfoRow label="Date of Joining" value={new Date(employee.dateOfJoining).toLocaleDateString()} />
                <InfoRow label="Employment Type" value={employee.employmentType || 'Full-Time'} />
                <InfoRow label="Legal Entity" value={employee.legalEntity || 'ARM Holding - CAPRI'} />
                <InfoRow label="Status" value={employee.status} />
              </Section>
            </div>
          )}

          {activeDetailTab === 'compensation' && (
            <div className="fade-in">
              <Section title="Earnings">
                <InfoRow label="Basic Salary" value={`AED ${employee.salary?.basic?.toLocaleString()}`} />
                <InfoRow label="Living Allowance" value={`AED ${employee.salary?.livingAllowance?.toLocaleString()}`} />
                <InfoRow label="Mobile Allowance" value={`AED ${employee.salary?.mobileAllowance?.toLocaleString()}`} />
                <InfoRow label="Gross Salary" value={`AED ${employee.salary?.gross?.toLocaleString()}`} bold />
              </Section>
              <Section title="Net Pay">
                <InfoRow label="Monthly Net Pay" value={`AED ${employee.salary?.netPay?.toLocaleString() || employee.salary?.gross?.toLocaleString() || '—'}`} bold />
                <InfoRow label="Note" value="UAE — No personal income tax" />
              </Section>
            </div>
          )}

          {activeDetailTab === 'leaves' && (
            <div className="fade-in">
              <Section title="Leave Balance">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', margin: '12px 0' }}>
                  {[
                    { label: 'Annual', val: employee.leaveBalance?.annual, max: employee.legalEntity?.includes('PRIVATE') ? 35 : 30, color: 'var(--sky-blue)' },
                    { label: 'Sick', val: employee.leaveBalance?.sick, max: 90, color: 'var(--blush-peach)' },
                    { label: 'Comp. Off', val: employee.leaveBalance?.compensatoryOff || 0, max: 10, color: 'var(--mint-green)' },
                  ].map(l => (
                    <div key={l.label} style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--grey-1)', marginBottom: '6px' }}>{l.label}</div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#fff', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(l.val / l.max) * 100}%`, background: l.color, borderRadius: '3px' }} />
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '6px' }}>{l.val}<span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--grey-2)' }}>/{l.max}</span></div>
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Leave History">
                {employee.leaveHistory?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {employee.leaveHistory.map((leave, i) => (
                      <div key={i} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600 }}>{leave.type} Leave — {leave.days} day(s)</span>
                          <span style={{ padding: '2px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: 600, background: leave.status === 'Approved' ? 'var(--mint-green)' : leave.status === 'Pending' ? 'var(--lime-yellow)' : 'var(--blush-peach)' }}>{leave.status}</span>
                        </div>
                        <div style={{ color: 'var(--grey-1)', marginTop: '4px' }}>{leave.reason}</div>
                        <div style={{ color: 'var(--grey-2)', marginTop: '2px' }}>
                          {leave.from ? new Date(leave.from).toLocaleDateString() : '—'} → {leave.to ? new Date(leave.to).toLocaleDateString() : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--grey-2)' }}>No leave history available</p>
                )}
              </Section>
            </div>
          )}

          {activeDetailTab === 'documents' && (
            <div className="fade-in">
              <Section title={`Documents (${empDocs.length})`}>
                {empDocs.length > 0 ? empDocs.map(doc => (
                  <a key={doc._id} href={doc.fileUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginTop: '8px', fontSize: '12px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: typeColor(doc.type) }}>{doc.type}</span>
                    <span style={{ flex: 1, fontWeight: 500 }}>{doc.title}</span>
                    <FiDownload size={14} color="var(--accent)" />
                  </a>
                )) : (
                  <p style={{ fontSize: '13px', color: 'var(--grey-2)' }}>No documents tagged to this employee</p>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Components ─── */
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h5 style={{ fontSize: '12px', fontWeight: 600, color: 'var(--grey-1)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>{title}</h5>
      {children}
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '13px' }}>
      <span style={{ color: 'var(--grey-1)' }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', required, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label} {required && '*'}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} placeholder={placeholder || ''} style={inputStyle} />
    </div>
  );
}

function typeColor(type) {
  const map = { 'Offer Letter': 'var(--mint-green)', 'Payslip': 'var(--sky-blue)', 'ID Proof': 'var(--lime-yellow)', 'Address Proof': 'var(--lime-yellow)', 'Education Certificate': 'var(--soft-lavender)', 'Experience Letter': 'var(--soft-lavender)', 'Appointment Letter': 'var(--mint-green)', 'Tax Document': 'var(--blush-peach)', 'Policy': 'var(--soft-lavender)', 'Appraisal': 'var(--blush-peach)', 'Contract': 'var(--grey-3)', 'Custom': 'var(--sky-blue)' };
  return map[type] || 'var(--grey-3)';
}

const tdStyle = { padding: '12px 16px' };
const thStyle = { padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--grey-1)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const selectStyle = { padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '13px', background: '#fff', minWidth: '140px', cursor: 'pointer' };
const paginationBtn = { background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', color: 'var(--grey-1)', cursor: 'pointer', border: '1px solid var(--border-color)' };
const labelStyle = { fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '13px', background: 'var(--bg-secondary)' };
