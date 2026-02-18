import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { FiHome, FiSettings, FiPlus, FiMessageSquare, FiSend, FiPaperclip, FiMic, FiDatabase, FiLogOut, FiUser, FiCompass } from 'react-icons/fi';

const roleBadge = (role) => {
  const map = { hr_head: { bg: 'var(--sky-blue)', label: 'HR Head' }, manager: { bg: 'var(--soft-lavender)', label: 'Manager' }, employee: { bg: 'var(--mint-green)', label: 'Employee' } };
  const r = map[role] || map.employee;
  return <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '50px', background: r.bg, fontWeight: 600, color: 'var(--brand-black)' }}>{r.label}</span>;
};

export default function ChatPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => { loadChatHistory(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadChatHistory = async () => {
    try {
      const { data } = await api.get('/chat/history');
      setChats(data);
    } catch (e) { console.error(e); }
  };

  const loadChat = async (chatId) => {
    try {
      const { data } = await api.get(`/chat/${chatId}`);
      setActiveChatId(chatId);
      setMessages(data.messages || []);
    } catch (e) { console.error(e); }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);

    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data } = await api.post('/chat', { message: msg, chatId: activeChatId });
      if (!activeChatId) setActiveChatId(data.chatId);
      setMessages(prev => [...prev, { role: 'assistant', content: data.response.content, data: data.response, timestamp: new Date() }]);
      loadChatHistory();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  const suggestions = [
    { title: 'Check Leave Balance', desc: 'View your remaining leaves' },
    { title: 'View Payslip', desc: 'Access your latest payslip' },
    { title: 'HR Policies', desc: 'Browse company policies' },
    { title: 'Ask a Question', desc: 'Get help from HR assistant' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 'var(--sidebar-width)', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <img src="/logos/wordmark.png" alt="NSOffice.AI" style={{ height: '28px', objectFit: 'contain' }} />
        </div>

        {/* Nav */}
        <div style={{ padding: '12px', flex: 1, overflow: 'auto' }}>
          <NavItem icon={<FiHome size={16} />} label="Home" active onClick={startNewChat} />
          <NavItem icon={<FiSettings size={16} />} label="Hive" />

          {user?.role === 'hr_head' && (
            <NavItem icon={<FiDatabase size={16} />} label="HR Database" onClick={() => navigate('/hrms')} accent />
          )}

          <div style={{ padding: '12px 0 8px' }}>
            <button onClick={startNewChat} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px 12px', background: 'transparent', border: '1px dashed var(--grey-3)', borderRadius: 'var(--radius-md)', color: 'var(--grey-1)', fontSize: '13px', cursor: 'pointer', transition: 'var(--transition)' }}>
              <FiPlus size={14} /> New Chat
            </button>
          </div>

          {/* Chat History */}
          <div style={{ marginTop: '8px' }}>
            {chats.map(chat => (
              <div key={chat._id} onClick={() => loadChat(chat._id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: activeChatId === chat._id ? 'var(--brand-black)' : 'var(--grey-1)', background: activeChatId === chat._id ? 'var(--border-color)' : 'transparent', fontSize: '13px', marginBottom: '2px', transition: 'var(--transition)' }}>
                <FiMessageSquare size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--grey-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiUser size={14} color="var(--grey-1)" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--grey-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {user?.employeeCode} {roleBadge(user?.role)}
            </div>
          </div>
          <button onClick={logout} style={{ background: 'none', padding: '6px', color: 'var(--grey-2)', borderRadius: '6px' }} title="Logout">
            <FiLogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--brand-black)', marginBottom: '40px' }}>What's the Move</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '560px', width: '100%' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.title)} style={{ padding: '20px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--brand-black)', marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '13px', color: 'var(--grey-1)' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 40px' }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {sending && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '16px 40px 20px' }}>
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-pill)', background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}>
            <FiCompass size={18} color="var(--grey-2)" />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything..."
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '14px', color: 'var(--text-primary)', outline: 'none' }} />
            <FiPaperclip size={18} color="var(--grey-2)" style={{ cursor: 'pointer' }} />
            <FiMic size={18} color="var(--grey-2)" style={{ cursor: 'pointer' }} />
            <button type="submit" disabled={sending || !input.trim()}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: input.trim() ? 'var(--accent)' : 'var(--grey-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)', flexShrink: 0 }}>
              <FiSend size={16} color="#fff" />
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--grey-2)', marginTop: '8px' }}>
            Enterprise data or AI innovation — every source tracked.
          </p>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, accent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: accent ? 'var(--accent)' : active ? 'var(--brand-black)' : 'var(--grey-1)', background: hovered ? 'var(--border-color)' : active ? 'var(--border-color)' : 'transparent', fontWeight: active ? 600 : 400, fontSize: '14px', transition: 'var(--transition)', marginBottom: '2px' }}>
      {icon} {label}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const data = message.data;

  return (
    <div className="fade-in" style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '20px' }}>
      {/* Assistant avatar */}
      {!isUser && (
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #6B8AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: '10px', marginTop: '2px' }}>
          <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>V</span>
        </div>
      )}
      <div style={{ maxWidth: '80%', minWidth: data?.type === 'table' ? '400px' : 'auto' }}>
        {/* Message bubble */}
        <div style={{
          padding: isUser ? '12px 18px' : '16px 20px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isUser ? 'var(--accent)' : '#fff',
          color: isUser ? '#fff' : 'var(--text-primary)',
          fontSize: '14px', lineHeight: 1.7,
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
          border: isUser ? 'none' : '1px solid var(--border-color)',
        }}>
          {/* Render markdown-like content */}
          <div dangerouslySetInnerHTML={{ __html: formatContent(message.content) }} />

          {/* Render table if present */}
          {data?.type === 'table' && data?.data && (
            <div style={{ marginTop: '14px', overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>{data.data.headers.map((h, i) => (
                    <th key={i} style={{
                      padding: '10px 14px', textAlign: 'left',
                      background: 'var(--brand-black)', color: '#fff',
                      fontWeight: 600, whiteSpace: 'nowrap', fontSize: '12px',
                      letterSpacing: '0.3px', textTransform: 'uppercase',
                    }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {data.data.rows.map((row, ri) => (
                    <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : 'var(--bg-secondary)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ri % 2 === 0 ? '#fff' : 'var(--bg-secondary)'}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '10px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}
                          dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--accent)">$1</strong>') }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Render document cards */}
          {data?.type === 'documents' && data?.documents && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.documents.map((doc, i) => (
                <a key={i} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: doc.type === 'Policy' ? 'var(--sky-blue)' : doc.type === 'Payslip' ? 'var(--mint-green)' : 'var(--soft-lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '16px' }}>{doc.type === 'Policy' ? '📋' : doc.type === 'Payslip' ? '💰' : '📄'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-black)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                    {doc.description && <div style={{ fontSize: '11px', color: 'var(--grey-1)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</div>}
                  </div>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '50px', background: doc.type === 'Policy' ? 'var(--sky-blue)' : doc.type === 'Payslip' ? 'var(--mint-green)' : 'var(--soft-lavender)', fontWeight: 600, flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{doc.type}</span>
                </a>
              ))}
            </div>
          )}

          {/* Linked documents from salary queries etc */}
          {data?.documents && data?.type !== 'documents' && (
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--grey-1)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Attached Documents</div>
              {data.documents.map((doc, i) => (
                <a key={i} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500, transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}>
                  <span>📄</span> {doc.title}
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={{ fontSize: '10px', color: 'var(--grey-2)', marginTop: '4px', textAlign: isUser ? 'right' : 'left', paddingLeft: isUser ? 0 : '4px', paddingRight: isUser ? '4px' : 0 }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function formatContent(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/• /g, '<span style="color:var(--accent);margin-right:6px">&#8226;</span>')
    .replace(/✅ /g, '<span style="margin-right:4px">&#9989;</span>');
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
      <div style={{ padding: '14px 20px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--grey-2)', animation: `pulse 1.2s ease infinite ${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
