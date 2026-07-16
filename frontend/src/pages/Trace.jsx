import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, CheckCircle2, Radio, ShieldAlert } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';

const AGENTS = ['intake', 'forensics', 'image_forensics', 'transcribe', 'behavioral', 'registry', 'osint', 'verdict'];

export default function Trace() {
  const { sessionId } = useParams();
  const [events, setEvents] = useState([]);
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stream = new EventSource(`/api/checks/${sessionId}/stream`);
    const add = (event) => {
      const data = JSON.parse(event.data);
      setEvents((current) => [...current, data]);
      if (data.type === 'risk' && data.status === 'done' && data.evidence?.verdict) setVerdict(data.evidence.verdict);
    };
    ['trace', 'risk', 'transcript'].forEach((type) => stream.addEventListener(type, add));
    stream.onerror = () => setError('Live stream disconnected. The trace shown so far is preserved.');
    return () => stream.close();
  }, [sessionId]);

  const grouped = useMemo(() => Object.fromEntries(AGENTS.map((agent) => [agent, events.filter((event) => event.agent === agent)])), [events]);
  const risk = verdict ? Math.round(verdict.risk * 100) : Math.round((events.filter((event) => event.type === 'risk').at(-1)?.score || 0) * 100);
  const transcript = events.filter((event) => event.type === 'transcript').at(-1)?.message;

  return <PageWrapper><div className="py-6 lg:py-8 max-w-6xl mx-auto">
    <Link to="/" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-secondary)' }}><ArrowLeft size={16} /> Back to DJAGA</Link>
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-7">
      <div><p className="text-xs uppercase tracking-[.16em]" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>Live investigation trace</p><h1 className="text-3xl font-bold mt-2" style={{ fontFamily: 'var(--font-display)' }}>How DJAGA reached its verdict</h1></div>
      <div className="rounded-2xl px-5 py-4 min-w-40" style={{ background: verdict?.level === 'danger' ? 'var(--threat-dim)' : 'var(--accent-dim)', border: '1px solid var(--border)' }}><p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Fused risk</p><p className="text-3xl font-bold" style={{ color: verdict?.level === 'danger' ? 'var(--threat)' : 'var(--accent)' }}>{risk}%</p></div>
    </div>
    {error && <p className="mb-4 text-sm" style={{ color: 'var(--warning)' }}>{error}</p>}
    <div className="grid lg:grid-cols-[1.45fr_.8fr] gap-6">
      <section className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        {AGENTS.map((agent) => <div key={agent} className="grid grid-cols-[112px_1fr] gap-3 py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 text-xs uppercase" style={{ color: grouped[agent].length ? 'var(--accent)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}><Radio size={13} />{agent.replace('_', ' ')}</div>
          <div className="space-y-2">{grouped[agent].length ? grouped[agent].map((event, index) => <div key={`${event.ts}-${index}`} className="rounded-lg px-3 py-2 text-sm" style={{ background: event.status === 'error' ? 'var(--threat-dim)' : 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}><span className="mr-2 text-[10px]" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{new Date(event.ts * 1000).toLocaleTimeString()}</span>{event.message}</div>) : <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Waiting…</span>}</div>
        </div>)}
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="flex items-center gap-2"><Activity size={17} style={{ color: 'var(--accent)' }} /><h2 className="font-semibold">Transcript</h2></div><p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{transcript || 'Waiting for transcription evidence…'}</p></section>
        <section className="rounded-2xl p-5" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}><div className="flex items-center gap-2"><ShieldAlert size={17} style={{ color: verdict?.level === 'danger' ? 'var(--threat)' : 'var(--accent)' }} /><h2 className="font-semibold">Evidence carried into the verdict</h2></div><div className="mt-3 space-y-3">{verdict?.evidence?.length ? verdict.evidence.map((item) => <div key={item.agent} className="text-sm"><p style={{ color: 'var(--text-primary)' }}>{item.claim}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{item.agent} · contribution {Math.round(item.weight_contribution * 100)}%</p></div>) : <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Evidence will appear as the investigation completes.</p>}</div>{verdict && <div className="mt-4 flex gap-2 text-sm" style={{ color: verdict.level === 'danger' ? 'var(--threat)' : 'var(--safe)' }}><CheckCircle2 size={16} /> {verdict.level === 'danger' ? 'Treat this as a potential scam.' : 'No decisive scam signal found.'}</div>}</section>
      </aside>
    </div>
  </div></PageWrapper>;
}
