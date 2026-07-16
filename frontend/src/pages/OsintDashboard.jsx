import { useCallback, useEffect, useState } from 'react';
import { Activity, Database, ExternalLink, Globe2, Radio, SearchCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';

function formatTime(timestamp) {
  return timestamp ? new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

export default function OsintDashboard() {
  const [data, setData] = useState({ logs: [], sources: [], mode: 'loading', exa_enabled: false });
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/osint/dashboard', { credentials: 'include' });
      if (!response.ok) throw new Error('Unable to load the OSINT activity stream.');
      setData(await response.json()); setError('');
    } catch (requestError) { setError(requestError.message); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 2000); return () => clearInterval(timer); }, [load]);
  const live = data.mode === 'real' && data.exa_enabled;
  return <PageWrapper><div className="py-6 lg:py-8 max-w-7xl mx-auto">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-7">
      <div><div className="inline-flex items-center gap-2 text-xs uppercase tracking-[.15em]" style={{ color: live ? 'var(--accent)' : 'var(--warning)', fontFamily: 'var(--font-mono)' }}><Radio size={14} /> {live ? 'Live Exa intelligence' : 'OSINT not live'}</div><h1 className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-display)' }}>OSINT agent dashboard</h1><p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Watch the agent extract entities, search public Malaysian scam intelligence, and return source evidence.</p></div>
      <div className="flex gap-3"><Link to="/scam-check" className="px-4 py-2.5 rounded-xl text-sm font-semibold no-underline" style={{ background: 'var(--accent)', color: '#07130e' }}>Run a Scam Check</Link><button onClick={load} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>Refresh</button></div>
    </div>
    {!live && <div className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--warning-dim)', border: '1px solid rgba(245,177,76,.28)', color: 'var(--text-secondary)' }}>Set <code>OSINT_MODE=real</code> and provide <code>EXA_API_KEY</code>, then restart the server to fetch live sources.</div>}
    {error && <p className="mb-5 text-sm" style={{ color: 'var(--threat)' }}>{error}</p>}
    <div className="grid xl:grid-cols-[.9fr_1.5fr] gap-6">
      <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}><Activity size={17} style={{ color: 'var(--accent)' }} /><h2 className="font-semibold">Agent logs</h2><span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>{data.logs.length} events</span></div><div className="max-h-[540px] overflow-y-auto p-3 space-y-2">{data.logs.length ? data.logs.map((log, index) => <div key={`${log.ts}-${index}`} className="rounded-xl p-3" style={{ background: log.status === 'error' ? 'var(--threat-dim)' : 'var(--bg-tertiary)' }}><div className="flex justify-between gap-3 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}><span>{formatTime(log.ts)} · {log.kind}</span><span style={{ color: log.status === 'evidence' ? 'var(--accent)' : 'inherit' }}>{log.status}</span></div><p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{log.message}</p></div>) : <Empty icon={Activity} text="Run a message or voice scan to see the OSINT agent’s live log." />}</div></section>
      <section className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}><Database size={17} style={{ color: 'var(--accent)' }} /><h2 className="font-semibold">Data fetched from Exa</h2><span className="ml-auto text-xs" style={{ color: 'var(--text-tertiary)' }}>{data.sources.length} sources</span></div>{data.sources.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Source', 'Entities searched', 'Query', 'Published', 'Open'].map(header => <th key={header} className="px-5 py-3 text-[10px] uppercase tracking-[.12em]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{header}</th>)}</tr></thead><tbody>{data.sources.map((source, index) => <tr key={`${source.url}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}><td className="px-5 py-4 max-w-64"><p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>{source.title || 'Public web report'}</p></td><td className="px-5 py-4 text-xs" style={{ color: 'var(--accent)' }}>{(source.entities || []).join(', ') || '—'}</td><td className="px-5 py-4 text-xs max-w-52 truncate" style={{ color: 'var(--text-secondary)' }}>{source.query || '—'}</td><td className="px-5 py-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{source.published_date || '—'}</td><td className="px-5 py-4">{source.url ? <a href={source.url} target="_blank" rel="noreferrer" aria-label="Open fetched source" style={{ color: 'var(--accent)' }}><ExternalLink size={17} /></a> : '—'}</td></tr>)}</tbody></table></div> : <div className="py-24"><Empty icon={Globe2} text="No live sources yet. Run a scan with a named institution, link, or phone number." /></div>}</section>
    </div>
  </div></PageWrapper>;
}

function Empty({ icon: Icon, text }) { return <div className="flex flex-col items-center justify-center text-center px-6 py-14"><div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}><Icon size={22} style={{ color: 'var(--accent)' }} /></div><p className="max-w-xs mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{text}</p></div>; }
