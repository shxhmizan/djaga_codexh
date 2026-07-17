import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, FileImage, FileText, Landmark, Link2, MessageSquareText, Phone, Search, ShieldCheck, Upload, X } from 'lucide-react';
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
  const [value, setValue] = useState(''); const [upload, setUpload] = useState(null); const [error, setError] = useState(''); const [uploadPreview, setUploadPreview] = useState(null);
  const uploadInput = useRef(null);
  const { isScanning, result: messageResult, traceEvents, startScan, resetScan } = useScanner();
  const inputType = useMemo(() => upload ? 'message' : detect(value), [value, upload]); const meta = TYPE_META[inputType]; const Icon = meta.icon;
  useEffect(() => () => resetScan(), [resetScan]);
  const reset = () => { setValue(''); setUpload(null); setUploadPreview(null); setError(''); resetScan(); };
  const chooseUpload = event => { const selected = event.target.files?.[0]; if (!selected) return; if (selected.size > 10 * 1024 * 1024) { setError('Upload a file smaller than 10 MB.'); return; } setError(''); setUpload(selected); };
  const scan = () => { setError(''); resetScan(); startScan('text', upload ? { file: upload, context: value, fileName: upload.name } : { text: value }); };
  const visibleResult = messageResult; const checking = isScanning;
  const dangerous = messageResult?.verdict === 'scam';
  useEffect(() => {
    if (!upload) { setUploadPreview(null); return undefined; }
    let active = true; let objectUrl = null;
    if (upload.type.startsWith('image/')) {
      objectUrl = URL.createObjectURL(upload);
      setUploadPreview({ kind:'image', url:objectUrl });
    } else if (upload.type.startsWith('text/') || /\.(txt|csv|json|md|log)$/i.test(upload.name)) {
      const reader = new FileReader();
      reader.onload = () => { if (active) setUploadPreview({ kind:'text', text:String(reader.result || '').slice(0, 560) }); };
      reader.onerror = () => { if (active) setUploadPreview({ kind:'file' }); };
      reader.readAsText(upload);
    } else setUploadPreview({ kind:'file' });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [upload]);
  const osintSources = traceEvents.flatMap(event => Array.isArray(event.evidence?.sources) ? event.evidence.sources : []).filter(source => source && typeof source === 'object').filter((source, index, all) => source.url && all.findIndex(item => item.url === source.url) === index);
  const visibleHighlights = (messageResult?.highlights || []).filter(item => !/^(exa searched|osint |live exa|\d+ related records found)/i.test(item));
  const liveLogs = traceEvents;
  return <PageWrapper><div className="py-6 lg:py-8 max-w-4xl mx-auto">
    <div className="mb-8"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3" style={{ background:'var(--accent-dim)',color:'var(--accent)' }}><ShieldCheck size={14}/> DJAGA protection</div><h1 className="text-3xl font-bold" style={{fontFamily:'var(--font-display)'}}>Scam Check</h1><p className="text-sm mt-2" style={{color:'var(--text-secondary)'}}>Paste a suspicious message, link, phone number, or bank account—or upload a conversation file. DJAGA combines database intelligence, scam-pattern analysis, and live Exa web research.</p></div>
    <div className="grid lg:grid-cols-2 gap-6"><section className="rounded-2xl p-5" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
      <div className="flex items-center gap-2 mb-3" style={{color:'var(--accent)'}}><Icon size={18}/><span className="text-sm font-semibold">Detected: {meta.label}</span></div>
      <textarea value={value} onChange={event => setValue(event.target.value)} placeholder="Paste a message, link, phone number, or bank account…" maxLength={12000} className="w-full min-h-52 p-4 rounded-xl resize-y focus:outline-none" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)',color:'var(--text-primary)',fontSize:'16px'}} />
      <input ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,text/csv,application/json,.md,.log" className="hidden" onChange={chooseUpload} />
      <div className="mt-3 flex items-center gap-3"><Button variant="secondary" onClick={() => uploadInput.current?.click()}><Upload size={16}/> Upload conversation</Button><span className="text-xs" style={{color:'var(--text-tertiary)'}}>PNG, JPG, WebP, PDF, TXT, CSV, JSON or MD · 10 MB max</span></div>
      {upload && <UploadPreview file={upload} preview={uploadPreview} onRemove={() => { setUpload(null); setUploadPreview(null); if (uploadInput.current) uploadInput.current.value = ''; }} />}
      <p className="text-xs mt-3" style={{color:'var(--text-tertiary)'}}>Conversation screenshots are transcribed for the check and discarded after analysis. Never upload a password, TAC/OTP code, or full identity number.</p>{error && <p className="text-sm mt-3" style={{color:'var(--threat)'}}>{error}</p>}
      <div className="flex gap-3 mt-5"><Button fullWidth onClick={scan} loading={checking} disabled={!value.trim() && !upload}><Search size={17}/> Investigate now</Button>{(visibleResult || checking) && <Button variant="secondary" onClick={reset}>Clear</Button>}</div>
    </section>
    <section className="rounded-2xl p-5 min-h-72" style={{background:'var(--bg-secondary)',border:'1px solid var(--border)'}}>
      {!visibleResult ? checking ? <LiveLogs logs={liveLogs} /> : <Empty /> : <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{color: dangerous?'var(--threat)':'var(--safe)'}}>{dangerous?<AlertTriangle size={16}/>:<ShieldCheck size={16}/>} {dangerous?'Potential scam detected':'No strong scam signal found'}</div>
        <h2 className="text-3xl font-bold mt-3" style={{fontFamily:'var(--font-display)',color:dangerous?'var(--threat)':'var(--safe)'}}>{`${messageResult.confidence}% confidence`}</h2>
        <><div className="mt-5 space-y-3">{visibleHighlights.map(item=><p key={item} className="text-sm" style={{color:'var(--text-secondary)'}}>• {item}</p>)}</div>{osintSources.length > 0 && <div className="mt-5 rounded-xl p-3" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)'}}><p className="text-xs font-semibold" style={{color:'var(--accent)'}}>RELATED REFERENCES</p><p className="mt-1 text-xs" style={{color:'var(--text-tertiary)'}}>Public sources returned by the live web investigation.</p><div className="mt-2 pt-2" style={{borderTop:'1px solid var(--border)'}}>{osintSources.slice(0,3).map((source,index)=><a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 py-1.5 text-xs no-underline" style={{color:'var(--accent)'}}>↗ {source.title || source.url}</a>)}</div></div>}</>
      </div>}
    </section></div>
  </div></PageWrapper>;
}
function Empty() { return <div className="h-full flex flex-col items-center justify-center text-center py-14"><ShieldCheck size={56} style={{color:'var(--text-tertiary)',opacity:.3}}/><p className="text-sm mt-4" style={{color:'var(--text-tertiary)'}}>Your result will explain what DJAGA found.</p></div>; }
function UploadPreview({ file, preview, onRemove }) { return <div className="mt-3 overflow-hidden rounded-xl" style={{background:'var(--bg-tertiary)',border:'1px solid var(--border)'}}><div className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 flex items-center gap-2 text-sm truncate" style={{color:'var(--text-secondary)'}}>{preview?.kind === 'image' ? <FileImage size={16} style={{color:'var(--accent)'}}/> : <FileText size={16} style={{color:'var(--accent)'}}/>}{file.name}<span className="shrink-0 text-xs" style={{color:'var(--text-tertiary)'}}>{Math.ceil(file.size / 1024)} KB</span></span><button type="button" className="p-1" aria-label="Remove upload" onClick={onRemove}><X size={16}/></button></div>{preview?.kind === 'image' && <img src={preview.url} alt={`Preview of ${file.name}`} className="block w-full max-h-56 object-contain" style={{background:'#07120f'}}/>}{preview?.kind === 'text' && <pre className="m-0 max-h-40 overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed" style={{borderTop:'1px solid var(--border)',color:'var(--text-secondary)',fontFamily:'var(--font-mono)'}}>{preview.text || 'This file is empty.'}</pre>}{preview?.kind === 'file' && <p className="p-3 text-xs" style={{borderTop:'1px solid var(--border)',color:'var(--text-tertiary)'}}>Preview is unavailable for this file type. DJAGA will extract supported conversation content during the check.</p>}</div>; }
function LiveLogs({ logs }) { return <div className="h-full py-4"><p className="text-xs font-semibold" style={{color:'var(--accent)'}}>LIVE CHECK LOG</p><p className="text-xs mt-1" style={{color:'var(--text-tertiary)'}}>These entries are emitted by the active check; no simulated progress is shown.</p><div className="mt-4 space-y-2">{logs.length ? logs.map((entry,index)=><div key={`${entry.ts}-${index}`} className="rounded-lg p-3 text-xs" style={{background:'var(--bg-tertiary)',color:'var(--text-secondary)'}}>• {entry.message}</div>) : <p className="text-sm" style={{color:'var(--text-tertiary)'}}>Waiting for the check service to begin…</p>}</div></div>; }
