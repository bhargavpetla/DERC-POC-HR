import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { FiHome, FiSettings, FiPlus, FiMessageSquare, FiSend, FiDatabase, FiLogOut, FiUser, FiTrash2 } from 'react-icons/fi';

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
  const inputRef = useRef(null);

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

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await api.delete(`/chat/${chatId}`);
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
      }
      setChats(prev => prev.filter(c => c._id !== chatId));
    } catch (e) { console.error(e); }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    inputRef.current?.focus();
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.response.content, timestamp: new Date() }]);
      loadChatHistory();
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', timestamp: new Date() }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    { icon: '📊', title: 'Check Leave Balance', desc: 'View your remaining leaves' },
    { icon: '💰', title: 'View My Payslip', desc: 'Access salary & compensation' },
    { icon: '📋', title: 'Company Policies', desc: 'Browse policy documents' },
    { icon: '💬', title: 'Ask HR a Question', desc: 'Get help from Veda' },
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
              <ChatHistoryItem
                key={chat._id}
                chat={chat}
                active={activeChatId === chat._id}
                onClick={() => loadChat(chat._id)}
                onDelete={(e) => deleteChat(e, chat._id)}
              />
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
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #6B8AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700 }}>V</span>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--brand-black)', marginBottom: '8px' }}>How can I help you today?</h1>
            <p style={{ fontSize: '14px', color: 'var(--grey-1)', marginBottom: '36px' }}>I'm Veda, your AI HR assistant. Ask me anything about your HR needs.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '560px', width: '100%' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.title)} style={{ padding: '16px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand-black)', marginBottom: '2px' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--grey-1)' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 0' }}>
            <div style={{ maxWidth: '768px', margin: '0 auto', padding: '0 24px' }}>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {sending && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div style={{ padding: '12px 24px 20px', maxWidth: '768px', margin: '0 auto', width: '100%' }}>
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '12px 16px', border: '1.5px solid var(--border-color)', borderRadius: '16px', background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'var(--transition)' }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Veda..."
              rows={1}
              style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '14px', color: 'var(--text-primary)', outline: 'none', resize: 'none', maxHeight: '120px', lineHeight: '1.5' }}
              onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <button type="submit" disabled={sending || !input.trim()}
              style={{ width: '34px', height: '34px', borderRadius: '10px', background: input.trim() ? 'var(--accent)' : 'var(--grey-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)', flexShrink: 0 }}>
              <FiSend size={15} color="#fff" />
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--grey-2)', marginTop: '8px' }}>
            Veda can make mistakes. Verify important information with HR.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHistoryItem({ chat, active, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: active ? 'var(--brand-black)' : 'var(--grey-1)', background: active ? 'var(--border-color)' : hovered ? 'rgba(0,0,0,0.03)' : 'transparent', fontSize: '13px', marginBottom: '2px', transition: 'var(--transition)' }}>
      <FiMessageSquare size={14} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{chat.title}</span>
      {hovered && (
        <button onClick={onDelete} title="Delete chat"
          style={{ background: 'none', padding: '4px', color: 'var(--grey-2)', borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#e53e3e'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--grey-2)'}>
          <FiTrash2 size={13} />
        </button>
      )}
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

  return (
    <div className="fade-in" style={{ display: 'flex', gap: '12px', marginBottom: '24px', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
      {/* Assistant avatar */}
      {!isUser && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #6B8AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>V</span>
        </div>
      )}
      <div style={{ maxWidth: isUser ? '70%' : '100%', minWidth: 0 }}>
        {isUser ? (
          <div style={{
            padding: '10px 16px',
            borderRadius: '18px 18px 4px 18px',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '14px', lineHeight: 1.6,
          }}>
            {message.content}
          </div>
        ) : (
          <div className="markdown-body" style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
        )}
        <div style={{ fontSize: '10px', color: 'var(--grey-2)', marginTop: '4px', textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {/* User avatar */}
      {isUser && (
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--grey-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
          <FiUser size={13} color="var(--grey-1)" />
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Escape HTML (basic)
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Tables
  html = html.replace(/^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)*)/gm, (match, headerRow, sepRow, bodyRows) => {
    const headers = headerRow.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
  });

  // Ordered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ol-item" value="$1">$2</li>');
  html = html.replace(/((?:<li class="ol-item"[^>]*>.*<\/li>\n?)+)/g, '<ol>$1</ol>');

  // Unordered lists
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    if (match.includes('class="ol-item"')) return match;
    return `<ul>${match}</ul>`;
  });

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr/>');

  // Paragraphs — convert double newlines
  html = html.replace(/\n\n/g, '</p><p>');
  // Single newlines inside text (not after block elements)
  html = html.replace(/(?<!<\/h[123]>|<\/table>|<\/div>|<\/pre>|<\/ul>|<\/ol>|<\/li>|<hr\/>|<\/p>|<p>)\n(?!<h[123]|<table|<div|<pre|<ul|<ol|<li|<hr|<\/p>|<p>)/g, '<br/>');

  // Wrap in paragraph if not starting with block element
  if (!/^<(h[123]|div|table|pre|ul|ol|hr)/.test(html)) {
    html = `<p>${html}</p>`;
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), #6B8AFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>V</span>
      </div>
      <div style={{ padding: '12px 18px', borderRadius: '16px', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--grey-2)', animation: `pulse 1.2s ease infinite ${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
