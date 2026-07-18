import { useState, useCallback, useRef } from 'react';

const PHASES = [
  { id: 1, label: 'Initialising DJAGA AI...', duration: 1200 },
  { id: 2, label: 'Investigating risk signals...', duration: 5000 },
  { id: 3, label: 'Cross-referencing scam intelligence...', duration: 6000 },
  { id: 4, label: 'Generating evidence-cited verdict...', duration: 3000 },
];
const TOTAL_DURATION = PHASES.reduce((sum, p) => sum + p.duration, 0);
const apiKind = (type) => type === 'text' ? 'message' : type;

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState(null);
  const [progress, setProgress] = useState(0);
  const [traceEvents, setTraceEvents] = useState([]);
  const streamRef = useRef(null);
  const timersRef = useRef([]);

  const clearTimers = useCallback(() => { timersRef.current.forEach(clearTimeout); timersRef.current = []; }, []);
  const startScan = useCallback(async (type, options = {}) => {
    clearTimers(); streamRef.current?.close();
    setIsScanning(true); setResult(null); setProgress(0); setPhase(PHASES[0]); setTraceEvents([]);
    const kind = apiKind(type);
    const requestAt = Date.now();
    try {
      const started = await fetch('/api/checks', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
      if (!started.ok) throw new Error('Could not start check');
      const { session_id } = await started.json();
      let body;
      let headers;
      if (options.text) {
        body = JSON.stringify({ text: options.text });
        headers = { 'Content-Type': 'application/json' };
      } else if (options.file) {
        body = new FormData();
        body.append('file', options.file, options.file.name || `${kind}-upload`);
        if (options.context) body.append('text', options.context);
      } else {
        throw new Error('Choose a file or enter a message before starting a scan.');
      }
      const analyzed = await fetch(`/api/checks/${session_id}/analyze`, { method: 'POST', credentials: 'include', headers, body });
      if (!analyzed.ok) {
        const failure = await analyzed.json().catch(() => ({}));
        throw new Error(failure.detail || 'Could not submit check');
      }
      const stream = new EventSource(`/api/checks/${session_id}/stream`);
      streamRef.current = stream;
      const recordEvent = (event) => {
        try { setTraceEvents((current) => [...current, JSON.parse(event.data)]); } catch { /* ignore malformed SSE */ }
      };
      stream.addEventListener('trace', recordEvent);
      stream.addEventListener('transcript', recordEvent);
      stream.addEventListener('risk', (event) => {
        const data = JSON.parse(event.data);
        setTraceEvents((current) => [...current, data]);
        if (data.status !== 'done') return;
        const verdict = data.evidence?.verdict;
        if (!verdict) return;
        const imageEvidence = type === 'image'
          ? verdict.evidence?.find((item) => item.agent === 'image_forensics')
          : null;
        const voiceEvidence = type === 'voice'
          ? verdict.evidence?.find((item) => item.agent === 'forensics')
          : null;
        const imagePayload = imageEvidence?.details || imageEvidence?.payload || imageEvidence || {};
        const voicePayload = voiceEvidence?.details || voiceEvidence?.payload || voiceEvidence || {};
        const syntheticProbability = Number(
          imagePayload.synthetic_probability ?? imageEvidence?.score ?? 0,
        );
        setResult({
          id: session_id, type, timestamp: new Date().toISOString(), live: true,
          // The image agent's authenticity signal and overall scam-context
          // risk are separate measurements. A likely-synthetic image must be
          // displayed as caution even when the wider OSINT verdict is lower.
          verdict: type === 'voice'
            ? (verdict.level === 'danger' ? 'scam' : verdict.level === 'caution' ? 'caution' : 'safe')
            : type === 'image' && syntheticProbability >= 0.5
              ? 'caution'
              : verdict.level === 'danger' ? 'scam' : 'safe',
          confidence: Math.round(verdict.risk * 100), highlights: verdict.evidence.map(item => item.claim),
          duration: Math.round((Date.now() - requestAt) / 1000), filename: options.fileName, text: options.text,
          evidence: verdict.evidence,
          riskLevel: verdict.level,
          imageAnalysis: type === 'image' && imageEvidence ? {
            syntheticProbability,
            topLabel: imagePayload.top_label,
            topLabelProbability: Number(imagePayload.top_label_probability ?? 0),
            model: imagePayload.model,
            provider: imagePayload.provider,
            available: true,
          } : null,
          voiceAnalysis: type === 'voice' && voiceEvidence ? {
            summary: voicePayload.voice_summary,
            transcript: verdict.excerpt || voicePayload.transcript,
            patterns: voicePayload.patterns || [],
            provider: voicePayload.provider,
            model: voicePayload.model,
          } : null,
          traceUrl: `/trace/${session_id}`,
        });
        setProgress(100); setIsScanning(false); setPhase(null); stream.close();
      });
      stream.onerror = () => { /* EventSource reconnects automatically; polling can be layered here by the trace client. */ };
    } catch (error) {
      setIsScanning(false); setPhase(null);
      setResult({ id: `failed-${Date.now()}`, type, verdict: 'safe', confidence: 0, highlights: [error.message || 'DJAGA could not reach the investigation service. Please try again.'], error: true });
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => setProgress(Math.min(95, ((Date.now() - startedAt) / TOTAL_DURATION) * 100)), 100);
    timersRef.current.push(interval);
    let elapsed = 0;
    PHASES.slice(1).forEach((item) => { elapsed += item.duration; timersRef.current.push(setTimeout(() => setPhase(item), elapsed)); });
  }, [clearTimers]);
  const cancelScan = useCallback(() => { streamRef.current?.close(); clearTimers(); setIsScanning(false); setPhase(null); setProgress(0); }, [clearTimers]);
  const resetScan = useCallback(() => { cancelScan(); setResult(null); }, [cancelScan]);
  return { isScanning, result, phase, progress, traceEvents, startScan, cancelScan, resetScan, PHASES, TOTAL_DURATION };
}
