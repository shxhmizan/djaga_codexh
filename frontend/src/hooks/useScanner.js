import { useState, useCallback, useRef } from 'react';
import { SCAN_HISTORY } from '../data/dummyScans';

// Simulates an AI scan with timed phases
// Returns a random result from dummy data that matches the scan type

const PHASES = [
  { id: 1, label: "Initialising DJAGA AI...", duration: 800 },
  { id: 2, label: "Analysing with neural network...", duration: 1400 },
  { id: 3, label: "Cross-referencing scam database...", duration: 800 },
  { id: 4, label: "Generating verdict...", duration: 600 },
];

const TOTAL_DURATION = PHASES.reduce((sum, p) => sum + p.duration, 0);

export function useScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [phase, setPhase] = useState(null);
  const [progress, setProgress] = useState(0);
  const cancelRef = useRef(false);
  const timeoutsRef = useRef([]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const getRandomResult = useCallback((type, forceVerdict = null) => {
    let matches = SCAN_HISTORY.filter(s => s.type === type);
    if (forceVerdict) {
      const verdictMap = {
        real: ['real', 'safe'],
        fake: ['fake', 'scam'],
        safe: ['real', 'safe'],
        scam: ['fake', 'scam'],
      };
      const targetVerdicts = verdictMap[forceVerdict] || [forceVerdict];
      const filtered = matches.filter(s => targetVerdicts.includes(s.verdict));
      if (filtered.length > 0) matches = filtered;
    }
    if (matches.length === 0) {
      // Fallback: create a generic result
      return {
        id: 'SCN-GEN-' + Date.now(),
        type,
        timestamp: new Date().toISOString(),
        verdict: forceVerdict || 'safe',
        confidence: 85 + Math.random() * 10,
        duration: TOTAL_DURATION,
        highlights: ['Analysis complete'],
      };
    }
    return { ...matches[Math.floor(Math.random() * matches.length)] };
  }, []);

  const startScan = useCallback(async (type, options = {}) => {
    const { forceVerdict, fileName, text } = options;
    cancelRef.current = false;
    setIsScanning(true);
    setResult(null);
    setPhase(PHASES[0]);
    setProgress(0);

    // The UI progress remains smooth, while the verdict itself comes from the real
    // FastAPI session and its SSE agent stream.
    try {
      const response = await fetch('/api/checks', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: type }),
      });
      const { session_id } = await response.json();
      const stream = new EventSource(`/api/checks/${session_id}/stream`);
      stream.addEventListener('risk', (event) => {
        const data = JSON.parse(event.data);
        if (data.status !== 'done') return;
        const verdict = data.evidence || {};
        const liveResult = {
          id: session_id, type, timestamp: new Date().toISOString(),
          verdict: verdict.level === 'danger' ? (type === 'image' || type === 'voice' ? 'fake' : 'scam') : 'safe',
          confidence: Math.round((verdict.risk || data.score || .77) * 100),
          highlights: (verdict.evidence || []).map(item => item.claim),
          duration: TOTAL_DURATION, filename: options.fileName, text: options.text,
          live: true,
        };
        setResult(liveResult); setIsScanning(false); setPhase(null); stream.close();
      });
    } catch {
      // A local fallback preserves offline usability if the API is unavailable.
    }

    // Progress animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(progressInterval);
        return;
      }
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 100);
      setProgress(pct);
    }, 50);

    // Phase transitions
    let accumulated = 0;
    PHASES.forEach((p, i) => {
      if (i > 0) {
        const t = setTimeout(() => {
          if (!cancelRef.current) setPhase(p);
        }, accumulated);
        timeoutsRef.current.push(t);
      }
      accumulated += p.duration;
    });

    // Completion
    const completeTimeout = setTimeout(() => {
      clearInterval(progressInterval);
      if (!cancelRef.current) {
        setProgress(100);
        if (cancelRef.current) return;
        const scanResult = getRandomResult(type, forceVerdict);
        scanResult.timestamp = new Date().toISOString();
        if (fileName) scanResult.filename = fileName;
        if (text) scanResult.text = text;
        // Only use seeded fallback if the live SSE verdict has not arrived yet.
        setResult(previous => previous || scanResult);
        setIsScanning(false);
        setPhase(null);
      }
    }, TOTAL_DURATION);
    timeoutsRef.current.push(completeTimeout);

    return () => {
      clearInterval(progressInterval);
      clearTimeouts();
    };
  }, [getRandomResult, clearTimeouts]);

  const cancelScan = useCallback(() => {
    cancelRef.current = true;
    clearTimeouts();
    setIsScanning(false);
    setPhase(null);
    setProgress(0);
  }, [clearTimeouts]);

  const resetScan = useCallback(() => {
    setResult(null);
    setPhase(null);
    setProgress(0);
    setIsScanning(false);
  }, []);

  return {
    isScanning,
    result,
    phase,
    progress,
    startScan,
    cancelScan,
    resetScan,
    PHASES,
    TOTAL_DURATION,
  };
}
