import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, CircleHelp, Database, FileText, LockKeyhole, LogOut, Mail, Moon, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import { useApp } from '../context/AppContext';

function Toggle({ value, onChange, label }) {
  return <button aria-label={label} onClick={() => onChange(!value)} className="relative w-12 h-7 rounded-full transition-colors" style={{ background: value ? 'var(--accent)' : 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
    <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: value ? 25 : 3, background: value ? '#062119' : 'var(--text-tertiary)' }} />
  </button>;
}

function Row({ icon: Icon, title, detail, action, danger = false, onClick }) {
  return <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.025]" style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default' }}>
    <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: danger ? 'var(--threat-dim)' : 'var(--accent-dim)', color: danger ? 'var(--threat)' : 'var(--accent)' }}><Icon size={18} /></span>
    <span className="flex-1 min-w-0"><span className="block text-sm font-semibold" style={{ color: danger ? 'var(--threat)' : 'var(--text-primary)' }}>{title}</span>{detail && <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{detail}</span>}</span>
    {action || <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />}
  </button>;
}

export default function Profile() {
  const { user, setUser, addToast } = useApp();
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [alerts, setAlerts] = useState(() => localStorage.getItem('djaga_alerts') !== 'false');
  const [privateMode, setPrivateMode] = useState(() => localStorage.getItem('djaga_private') === 'true');

  useEffect(() => {
    document.title = 'Profile — DJAGA';
    fetch('/api/checks', { credentials: 'include' }).then(r => r.ok ? r.json() : []).then(setChecks).catch(() => setChecks([]));
  }, []);
  useEffect(() => localStorage.setItem('djaga_alerts', String(alerts)), [alerts]);
  useEffect(() => localStorage.setItem('djaga_private', String(privateMode)), [privateMode]);
  const stats = useMemo(() => ({ total: checks.length, danger: checks.filter(c => c.level === 'danger').length, latest: checks[0]?.level || 'No checks yet' }), [checks]);
  const initials = (user?.name || 'DJ').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null); navigate('/');
  };

  return <PageWrapper><div className="py-6 lg:py-8 max-w-3xl mx-auto">
    <header className="mb-7"><p className="text-xs uppercase tracking-[.18em] mb-2" style={{ color: 'var(--accent)' }}>Your DJAGA</p><h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>Profile & settings</h1></header>

    <Card className="mb-5 overflow-hidden"><div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: 'var(--accent)', color: '#062119', boxShadow: '0 0 30px var(--accent-dim)' }}>{initials}</div><div className="min-w-0 flex-1"><h2 className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>{user?.name || 'DJAGA member'}</h2><p className="text-sm truncate mt-1" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p><span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}><ShieldCheck size={13} /> Protected account</span></div></div>
      <div className="grid grid-cols-3 border-t" style={{ borderColor: 'var(--border)' }}><div className="p-4 text-center"><strong className="block text-xl" style={{ color: 'var(--text-primary)' }}>{stats.total}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Checks run</span></div><div className="p-4 text-center border-x" style={{ borderColor: 'var(--border)' }}><strong className="block text-xl" style={{ color: stats.danger ? 'var(--threat)' : 'var(--text-primary)' }}>{stats.danger}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Risks caught</span></div><div className="p-4 text-center"><strong className="block text-sm truncate pt-1" style={{ color: 'var(--accent)' }}>{stats.latest}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Last verdict</span></div></div>
    </Card>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Account</h2><Card className="overflow-hidden"><Row icon={UserRound} title="Account details" detail={user?.email} onClick={() => addToast({ type: 'info', message: 'Your account details are managed securely by DJAGA.' })} /><Row icon={Mail} title="Communication preferences" detail="Security updates and scam alerts" onClick={() => addToast({ type: 'info', message: 'Communication preferences are saved on this device.' })} /><Row icon={LockKeyhole} title="Password & security" detail="Password protected account" onClick={() => addToast({ type: 'info', message: 'Password reset will be available in a future account update.' })} /></Card></section>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Protection settings</h2><Card className="overflow-hidden"><Row icon={Bell} title="Scam alerts" detail="Receive alerts for emerging local threats" action={<Toggle label="Toggle scam alerts" value={alerts} onChange={setAlerts} />} /><Row icon={Database} title="Private analysis" detail="Keep local preferences private on this device" action={<Toggle label="Toggle private analysis" value={privateMode} onChange={setPrivateMode} />} /><Row icon={SlidersHorizontal} title="Detection preferences" detail="Protection checks are configured by your DJAGA workspace" onClick={() => addToast({ type: 'info', message: 'Detection preferences are configured by your DJAGA workspace.' })} /></Card></section>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Support & privacy</h2><Card className="overflow-hidden"><Row icon={FileText} title="Check history" detail={`${stats.total} saved check${stats.total === 1 ? '' : 's'}`} onClick={() => navigate('/feed')} /><Row icon={CircleHelp} title="Help centre" detail="Scam-safety guidance and support" onClick={() => navigate('/chat')} /><Row icon={LogOut} title="Sign out" detail="Sign out from this device" danger onClick={signOut} /></Card></section>
    <p className="text-center text-xs pb-6" style={{ color: 'var(--text-tertiary)' }}><Sparkles size={12} className="inline mr-1" />DJAGA protects your privacy. Audio is analysed in-session.</p>
  </div></PageWrapper>;
}
