import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Landmark, Link2, MessageSquareText, Phone, Search, ShieldCheck } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import { useScanner } from '../hooks/useScanner';

function detect(value) {
  const trimmed = value.trim(); const compact = trimmed.replace(/[\s-]/g, ''); const digits = trimmed.replace(/\D/g, '');
  if (/^(https?:\/\/)?[^\s/]+\.[^\s]+/i.test(trimmed)) return 'link';
  if (/^(?:\+?60|0)\d{8,10}$/.test(compact)) return 'phone';
  if (/^\d{8,18}$/.test(digits)) return 'bank_account';
  return 'message';
}
const TYPE_META = { message: { label: 'Message', icon: MessageSquareText }, link: { label: 'Link', icon: Link2 }, phone: { label: 'Phone number', icon: Phone }, bank_account: { label: 'Bank account', icon: Landmark } };

export default function ScamCheck() {
  const [value, setValue] = useState(''); const [identifierResult, setIdentifierResult] = useState(null); const [identifierLogs, setIdentifierLogs] = useState([]); const [identifierChecking, setIdentifierChecking] = useState(false); const [error, setError] = useState('');
  const identifierStream = useRef(null);
  const { isScanning, result: messageResult, traceEvents, startScan, resetScan } = useScanner();
  const inputType = useMemo(() => detect(value), [value]); const meta = TYPE_META[inputType]; const Icon = meta.icon;
  useEffect(() => () => identifierStream.current?.close(), []);
  const reset = () => { identifierStream.current?.close(); setValue(''); setIdentifierResult(null); setIdentifierLogs([]); setIdentifierChecking(false); setError(''); resetScan(); };
  const scanIdentifier = async () => {
    setIdentifierChecking(true); setIdentifierLogs([]);
    try {
      const start = await fetch('/api/scam-check/identifier/start', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      const started = await start.json(); if (!start.ok) throw new Error(started.detail || 'Unable to start identifier check.');
      const stream = new EventSource(`/api/scam-check/identifier/${started.job_id}/stream`); identifierStream.current = stream;
      stream.addEventListener('trace', event => { const entry = JSON.parse(event.data); setIdentifierLogs(current => [...current, entry]); });
      stream.addEventListener('result', event => { setIdentifierResult(JSON.parse(event.data)); setIdentifierChecking(false); stream.close(); });
      stream.addEventListener('error', event => { try { setError(JSON.parse(event.data).detail || 'Identifier check failed.'); } catch { setError('Identifier check failed.'); } setIdentifierChecking(false); stream.close(); });
      stream.onerror = () => { /* server-sent events reconnect automatically while the job is active */ };
    } catch (requestError) { setError(requestError.message); setIdentifierChecking(false); }
  };
  const scan = () => { setError(''); setIdentifierResult(null); setIdentifierLogs([]); resetScan(); if (inputType === 'message') startScan('text', { text: value }); else scanIdentifier(); };
  const visibleResult = identifierResult || messageResult; const checking = isScanning || identifierChecking;
  const dangerous = identifierResult ? identifierResult.level === 'danger' : messageResult?.verdict === 'scam';
  const osintEvents = traceEvents.filter(event => event.agent === 'osint');
  const osintSources = osintEvents.flatMap(event => Array.isArray(event.evidence?.sources) ? event.evidence.sources : []).filter(source => source && typeof source === 'object');
  const liveLogs = inputType === 'message' ? traceEvents : identifierLogs;
  return <PageWrapper><div className="py-6 lg:py-8 max-w-4xl mx-auto">
    <div className="mb-8"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ background:'var(--accent-dim)',color:'var(--accent)' }}><ShieldCheck size={14}/> DJAGA protection</div><h1 className="text-3xl font-bold" style={{fontFamily:'var(--font-display)'}}>Scam Check</h1><p className="text-sm mt-2" style={{color:'var(--text-secondary)'}}>Paste a suspicious message, web link, phone number, or bank account. DJAGA checks real database intelligence and available live signals.</p></div>
    <div className="grid lg:grid-cols-2 gap-6"><section className="rounded-2xl p-5" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
      <div className="flex items-center gap-2 mb-3" style={{color:'var(--accent)'}}><Icon size={18}/><span className="text-sm font-semibold">Detected: {meta.label}</span></div>
      <textarea value={value} onChange={event => setValue(event.target.value)} placeholder="Paste a message, link, phone number, or bank account…" maxLength={1200} className="w-full min-h-52 p-4 rounded-xl resize-y focus:outline-none" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)',color:'var(--text-primary)',fontSize:'16px'}} />
      <p className="text-xs mt-2" style={{color:'var(--text-tertiary)'}}>Never enter a password, TAC/OTP code, or full personal identity number.</p>{error && <p className="text-sm mt-3" style={{color:'var(--threat)'}}>{error}</p>}
      <div className="flex gap-3 mt-5"><Button fullWidth onClick={scan} loading={checking} disabled={!value.trim()}><Search size={17}/> Check now</Button>{(visibleResult || checking) && <Button variant="secondary" onClick={reset}>Clear</Button>}</div>
    </section>
    <section className="rounded-2xl p-5 min-h-72" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
      {!visibleResult ? checking ? <LiveLogs logs={liveLogs} /> : <Empty /> : <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{color: dangerous?'var(--threat)':'var(--safe)'}}>{dangerous?<AlertTriangle size={16}/>:<ShieldCheck size={16}/>} {dangerous?'Potential scam detected':'No strong scam signal found'}</div>
        <h2 className="text-3xl font-bold mt-3" style={{fontFamily:'var(--font-display)',color:dangerous?'var(--threat)':'var(--safe)'}}>{identifierResult ? `${Math.round(identifierResult.risk*100)}% risk` : `${messageResult.confidence}% confidence`}</h2>
        {identifierResult ? <><div className="mt-5 rounded-xl p-3" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)'}}><p className="text-xs font-semibold" style={{color:identifierResult.top_match?'var(--threat)':'var(--warning)'}}>{identifierResult.top_match ? 'TOP 10 DATABASE MATCH · HIGH RISK' : 'SEMAKMULE · MOCK'}</p><p className="text-sm mt-1" style={{color:'var(--text-secondary)'}}>{identifierResult.top_match ? `${identifierResult.top_match.identifier} appears in persisted DJAGA intelligence with ${identifierResult.top_match.reports} reports.` : identifierResult.registry.message}</p></div><div className="mt-5 space-y-3">{identifierResult.evidence.map((item,index)=><p key={`${item.agent}-${index}`} className="text-sm leading-relaxed" style={{color:'var(--text-secondary)'}}>• {item.claim}</p>)}</div></> : <><div className="mt-5 space-y-3">{messageResult.highlights?.map(item=><p key={item} className="text-sm" style={{color:'var(--text-secondary)'}}>• {item}</p>)}</div>{osintEvents.length > 0 && <div className="mt-5 rounded-xl p-3" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)'}}><p className="text-xs font-semibold" style={{color:'var(--accent)'}}>LIVE OSINT LOG</p><div className="mt-2 space-y-2">{osintEvents.map((event,index)=><p key={`${event.ts}-${index}`} className="text-xs leading-relaxed" style={{color:'var(--text-secondary)'}}>• {event.message}</p>)}</div>{osintSources.length > 0 && <div className="mt-3 pt-3" style={{borderTop:'1px solid var(--border)'}}>{osintSources.slice(0,3).map((source,index)=><a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1 text-xs no-underline" style={{color:'var(--accent)'}}>↗ {source.title || source.url}</a>)}</div>}</div>}</>}
      </div>}
    </section></div>
  </div></PageWrapper>;
}
function Empty() { return <div className="h-full flex flex-col items-center justify-center text-center py-14"><ShieldCheck size={56} style={{color:'var(--text-tertiary)',opacity:.3}}/><p className="text-sm mt-4" style={{color:'var(--text-tertiary)'}}>Your result will explain what DJAGA found.</p></div>; }
function LiveLogs({ logs }) { return <div className="h-full py-4"><p className="text-xs font-semibold" style={{color:'var(--accent)'}}>LIVE CHECK LOG</p><p className="text-xs mt-1" style={{color:'var(--text-tertiary)'}}>These entries are emitted by the active check; no simulated progress is shown.</p><div className="mt-4 space-y-2">{logs.length ? logs.map((entry,index)=><div key={`${entry.ts}-${index}`} className="rounded-lg p-3 text-xs" style={{background:'var(--bg-tertiary)',color:'var(--text-secondary)'}}>• {entry.message}</div>) : <p className="text-sm" style={{color:'var(--text-tertiary)'}}>Waiting for the check service to begin…</p>}</div></div>; }
