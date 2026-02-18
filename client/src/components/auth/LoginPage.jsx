import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', padding: '20px' },
  card: { background: '#fff', borderRadius: 'var(--radius-lg)', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' },
  logo: { textAlign: 'center', marginBottom: '32px' },
  logoText: { fontSize: '28px', fontWeight: 700, color: 'var(--brand-black)', letterSpacing: '-0.5px' },
  logoBar: { display: 'inline-block', width: '22px', height: '14px', background: 'var(--brand-black)', borderRadius: '7px', position: 'relative', margin: '0 1px', verticalAlign: 'middle' },
  logoDot: { position: 'absolute', right: '3px', top: '3px', width: '8px', height: '8px', background: '#fff', borderRadius: '50%' },
  subtitle: { fontSize: '14px', color: 'var(--grey-1)', marginTop: '8px' },
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' },
  input: { width: '100%', padding: '12px 16px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '14px', transition: 'var(--transition)', background: 'var(--bg-secondary)' },
  button: { width: '100%', padding: '14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', marginTop: '8px' },
  demoSection: { marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' },
  demoHeader: { fontSize: '13px', fontWeight: 600, color: 'var(--grey-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  demoTable: { width: '100%', marginTop: '12px', fontSize: '12px' },
  demoRow: { cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', transition: 'var(--transition)' },
  badge: (color) => ({ fontSize: '10px', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: color, fontWeight: 600 }),
  error: { color: '#ef4444', fontSize: '13px', textAlign: 'center' },
};

export default function LoginPage() {
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(employeeCode, password);
      toast.success(`Welcome, ${user.firstName}!`);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (code) => {
    setEmployeeCode(code);
    setPassword('nsoffice123');
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="fade-in">
        <div style={styles.logo}>
          <img src="/logos/wordmark.png" alt="NSOffice.AI" style={{ height: '36px', objectFit: 'contain', marginBottom: '8px' }} />
          <p style={styles.subtitle}>Your AI-powered HR Concierge</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div>
            <label style={styles.label}>Employee Code</label>
            <input style={styles.input} type="text" placeholder="e.g. 11181, 11177, 11176" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} required />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={{ ...styles.button, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.demoSection}>
          <div style={styles.demoHeader} onClick={() => setShowDemo(!showDemo)}>
            <span>Demo Credentials</span>
            <span>{showDemo ? '▲' : '▼'}</span>
          </div>
          {showDemo && (
            <div style={styles.demoTable}>
              {[
                { code: '11181', name: 'Ethan Garcia', role: 'HR Head', badge: 'var(--sky-blue)' },
                { code: '11177', name: 'Liam Johnson', role: 'Manager', badge: 'var(--soft-lavender)' },
                { code: '11176', name: 'Olivia Smith', role: 'Employee', badge: 'var(--mint-green)' },
              ].map((cred) => (
                <div key={cred.code} style={styles.demoRow} onClick={() => fillCredentials(cred.code)} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <span><strong>{cred.code}</strong> — {cred.name}</span>
                  <span style={styles.badge(cred.badge)}>{cred.role}</span>
                </div>
              ))}
              <p style={{ fontSize: '11px', color: 'var(--grey-2)', marginTop: '8px', textAlign: 'center' }}>
                Password for all: <strong>nsoffice123</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
