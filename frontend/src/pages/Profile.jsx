import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, CircleHelp, Clock3, Database, FileText, LockKeyhole, LogOut, Mail, ShieldAlert, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Card from '../components/ui/Card';
import { useApp } from '../context/AppContext';

function Toggle({ value, onChange, label }) {
  return <button aria-label={label} onClick={() => onChange(!value)} className="relative w-12 h-7 rounded-full transition-colors" style={{ background: value ? 'var(--accent)' : 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
    <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: value ? 25 : 3, background: value ? '#062119' : 'var(--text-tertiary)' }} />
  </button>;
}

function Row({ icon: Icon, title, detail, action, danger = false, onClick }) {
  const content = <><span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: danger ? 'var(--threat-dim)' : 'var(--accent-dim)', color: danger ? 'var(--threat)' : 'var(--accent)' }}><Icon size={18} /></span>
    <span className="flex-1 min-w-0"><span className="block text-sm font-semibold" style={{ color: danger ? 'var(--threat)' : 'var(--text-primary)' }}>{title}</span>{detail && <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{detail}</span>}</span>
    {action || <ChevronRight size={18} style={{ color: 'var(--text-tertiary)' }} />}</>;
  const style = { background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: onClick ? 'pointer' : 'default' };
  if (!onClick && action) return <div className="w-full flex items-center gap-3 px-4 py-4 text-left" style={style}>{content}</div>;
  return <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.025]" style={style}>
    {content}
  </button>;
}

export default function Profile() {
  const { user, setUser, addToast } = useApp();
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [alerts, setAlerts] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [latestVerdict, setLatestVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);

  useEffect(() => {
    document.title = 'Profile — DJAGA';
    fetch('/api/checks', { credentials: 'include' }).then(r => r.ok ? r.json() : []).then(setChecks).catch(() => setChecks([]));
    fetch('/api/profile/settings', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(settings => { if (settings) { setAlerts(settings.scam_alerts); setPrivateMode(settings.private_analysis); } });
  }, []);
  const saveSettings = async changes => {
    try {
      const response = await fetch('/api/profile/settings', { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(changes) });
      const settings = await response.json().catch(() => ({}));
      if (!response.ok) return addToast({ type:'error', message:settings.detail || 'Could not save setting.' });
      setAlerts(settings.scam_alerts); setPrivateMode(settings.private_analysis);
      addToast({ type:'success', message:'Setting saved.' });
    } catch {
      addToast({ type:'error', message:'Could not reach DJAGA. Your setting was not changed.' });
    }
  };
  const completedChecks = useMemo(() => checks.filter(check => check.status === 'complete' && check.level && check.risk != null), [checks]);
  const latestCheck = completedChecks[0] || null;
  const stats = useMemo(() => ({ total: checks.length, danger: completedChecks.filter(c => c.level === 'danger').length, latest: latestCheck }), [checks.length, completedChecks, latestCheck]);
  useEffect(() => {
    if (!latestCheck?.id) { setLatestVerdict(null); return; }
    let active = true; setVerdictLoading(true);
    fetch(`/api/checks/${latestCheck.id}/verdict`, { credentials: 'include' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (active) setLatestVerdict(data); })
      .catch(() => { if (active) setLatestVerdict(null); })
      .finally(() => { if (active) setVerdictLoading(false); });
    return () => { active = false; };
  }, [latestCheck?.id]);
  const initials = (user?.name || 'DJ').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      if (!response.ok) throw new Error('Sign out failed');
      setUser(null); navigate('/');
    } catch {
      addToast({ type:'error', message:'Could not sign out. Please try again.' });
    }
  };

  return <PageWrapper><div className="py-6 lg:py-8 max-w-3xl mx-auto">
    <header className="mb-7"><p className="text-xs uppercase tracking-[.18em] mb-2" style={{ color: 'var(--accent)' }}>Your DJAGA</p><h1 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-1px' }}>Profile & settings</h1></header>

    <Card className="mb-5 overflow-hidden"><div className="p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, var(--accent-dim), transparent)' }}><div className="w-16 h-16 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: 'var(--accent)', color: '#062119', boxShadow: '0 0 30px var(--accent-dim)' }}>{initials}</div><div className="min-w-0 flex-1"><h2 className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-display)' }}>{user?.name || 'DJAGA member'}</h2><p className="text-sm truncate mt-1" style={{ color: 'var(--text-secondary)' }}>{user?.email}</p><span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ color: 'var(--accent)', background: 'var(--accent-dim)' }}><ShieldCheck size={13} /> Protected account</span></div></div>
      <div className="grid grid-cols-3 border-t" style={{ borderColor: 'var(--border)' }}><div className="p-4 text-center"><strong className="block text-xl" style={{ color: 'var(--text-primary)' }}>{stats.total}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Checks run</span></div><div className="p-4 text-center border-x" style={{ borderColor: 'var(--border)' }}><strong className="block text-xl" style={{ color: stats.danger ? 'var(--threat)' : 'var(--text-primary)' }}>{stats.danger}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Risks caught</span></div><div className="p-4 text-center"><strong className="block text-sm truncate pt-1 capitalize" style={{ color: stats.latest?.level === 'danger' ? 'var(--threat)' : stats.latest?.level === 'caution' ? 'var(--warning)' : 'var(--accent)' }}>{stats.latest ? `${Math.round(stats.latest.risk * 100)}% ${stats.latest.level}` : '—'}</strong><span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Last verdict</span></div></div>
    </Card>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Latest protection check</h2>
      {!latestCheck ? <Card hover={false}><ShieldCheck size={25} style={{color:'var(--accent)'}}/><h2 className="mt-3 font-semibold">No checks completed yet</h2><p className="mt-1 text-sm" style={{color:'var(--text-secondary)'}}>Run a scan to save an evidence-backed protection verdict here.</p><button onClick={() => navigate('/scam-check')} className="mt-4 text-sm font-semibold" style={{background:'none',border:0,padding:0,color:'var(--accent)',cursor:'pointer'}}>Start a Scam Check →</button></Card> : <Card padding={false} onClick={() => navigate(`/trace/${latestCheck.id}`)} className="overflow-hidden"><div className="p-5" style={{background:latestCheck.level === 'danger'?'linear-gradient(135deg, var(--threat-dim), transparent)':latestCheck.level === 'caution'?'linear-gradient(135deg, var(--warning-dim), transparent)':'linear-gradient(135deg, var(--safe-dim), transparent)'}}><div className="flex items-start gap-3"><span className="w-11 h-11 rounded-xl flex items-center justify-center" style={{background:latestCheck.level === 'danger'?'var(--threat-dim)':latestCheck.level === 'caution'?'var(--warning-dim)':'var(--safe-dim)',color:latestCheck.level === 'danger'?'var(--threat)':latestCheck.level === 'caution'?'var(--warning)':'var(--safe)'}}>{latestCheck.level === 'danger'?<ShieldAlert size={21}/>:<ShieldCheck size={21}/>}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="font-semibold capitalize">{latestCheck.kind} check</p><strong className="text-lg" style={{color:latestCheck.level === 'danger'?'var(--threat)':latestCheck.level === 'caution'?'var(--warning)':'var(--safe)'}}>{Math.round(latestCheck.risk * 100)}%</strong></div><p className="mt-1 text-sm font-medium capitalize" style={{color:latestCheck.level === 'danger'?'var(--threat)':latestCheck.level === 'caution'?'var(--warning)':'var(--safe)'}}>{latestCheck.level === 'danger'?'Potential scam':latestCheck.level === 'caution'?'Mixed scam signals':'No strong scam signal'}</p><p className="mt-2 text-xs flex items-center gap-1" style={{color:'var(--text-tertiary)'}}><Clock3 size={12}/>{new Date(latestCheck.created_at * 1000).toLocaleString()}</p></div></div>{verdictLoading?<p className="mt-4 text-sm" style={{color:'var(--text-secondary)'}}>Loading stored evidence…</p>:<p className="mt-4 text-sm leading-relaxed" style={{color:'var(--text-secondary)'}}>{latestVerdict?.evidence?.[0]?.claim || latestCheck.transcript || 'Stored verdict evidence is available in the trace.'}</p>}<span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{color:'var(--accent)'}}>View evidence <ChevronRight size={16}/></span></div></Card>}</section>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Account</h2><Card className="overflow-hidden"><Row icon={UserRound} title="Account details" detail={user?.email} onClick={() => navigate('/profile/account')} /><Row icon={Mail} title="Communication preferences" detail="Security updates and scam alerts" onClick={() => navigate('/profile/communication')} /><Row icon={LockKeyhole} title="Password & security" detail="Password protected account" onClick={() => navigate('/profile/security')} /></Card></section>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Protection settings</h2><Card className="overflow-hidden"><Row icon={Bell} title="Scam alerts" detail="Receive alerts for emerging local threats" action={<Toggle label="Toggle scam alerts" value={alerts} onChange={value => saveSettings({scam_alerts:value})} />} /><Row icon={Database} title="Private analysis" detail="Keep local preferences private on this device" action={<Toggle label="Toggle private analysis" value={privateMode} onChange={value => saveSettings({private_analysis:value})} />} /><Row icon={SlidersHorizontal} title="Detection preferences" detail="See active protection services" onClick={() => navigate('/profile/detection')} /></Card></section>

    <section className="mb-5"><h2 className="text-xs uppercase tracking-[.16em] px-1 mb-2" style={{ color: 'var(--text-tertiary)' }}>Support & privacy</h2><Card className="overflow-hidden"><Row icon={FileText} title="Check history" detail={`${stats.total} saved check${stats.total === 1 ? '' : 's'}`} onClick={() => navigate('/profile/history')} /><Row icon={CircleHelp} title="Help centre" detail="Scam-safety guidance and support" onClick={() => navigate('/profile/help')} /><Row icon={LogOut} title="Sign out" detail="Sign out from this device" danger onClick={signOut} /></Card></section>
    <p className="text-center text-xs pb-6" style={{ color: 'var(--text-tertiary)' }}><Sparkles size={12} className="inline mr-1" />DJAGA protects your privacy. Audio is analysed in-session.</p>
  </div></PageWrapper>;
}
