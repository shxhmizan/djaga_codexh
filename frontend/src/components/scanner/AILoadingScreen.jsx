import { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, X } from 'lucide-react';

const PHASES = [
  { id: 1, label: "Initialising DJAGA AI...", duration: 800 },
  { id: 2, label: "Analysing with neural network...", duration: 1400 },
  { id: 3, label: "Cross-referencing scam database...", duration: 800 },
  { id: 4, label: "Generating verdict...", duration: 600 },
];

const TOTAL_DURATION = PHASES.reduce((sum, p) => sum + p.duration, 0);

export default function AILoadingScreen({ type = 'image', fileName, text, onComplete }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [waitingForVerdict, setWaitingForVerdict] = useState(false);
  const [dotIndex, setDotIndex] = useState(0);
  const startTimeRef = useRef(Date.now());
  const animFrameRef = useRef(null);

  // Progress animation with requestAnimationFrame
  useEffect(() => {
    startTimeRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / TOTAL_DURATION) * 95, 95);
      setProgress(pct);

      // Determine current phase
      let accumulated = 0;
      for (let i = 0; i < PHASES.length; i++) {
        accumulated += PHASES[i].duration;
        if (elapsed < accumulated) {
          setCurrentPhase(i);
          break;
        }
      }

      if (elapsed >= TOTAL_DURATION) {
        // The visual setup has finished; do not pretend the real server-side
        // model has completed. The overlay remains until its SSE verdict.
        setProgress(95);
        setCurrentPhase(PHASES.length - 1);
        setWaitingForVerdict(true);
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [onComplete]);

  // Pulsing dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex(prev => (prev + 1) % 6);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (onComplete) onComplete({ cancelled: true });
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'rgba(10,10,15,0.97)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
        >
          <Shield size={24} style={{ color: 'var(--accent)' }} />
        </div>
        <span
          className="text-xl font-extrabold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          DJAGA
        </span>
      </div>

      {/* Phase label */}
      <div className="h-6 mb-6 flex items-center">
        <span
          key={currentPhase}
          className="text-xs uppercase tracking-[2px]"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-light)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {waitingForVerdict ? 'Model inference in progress — awaiting live verdict' : PHASES[currentPhase]?.label}
        </span>
      </div>

      {/* Type-specific animation area */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{
          width: 360,
          height: 260,
          maxWidth: 'calc(100vw - 48px)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}
      >
        {type === 'image' && <ImageAnimation fileName={fileName} progress={progress} />}
        {type === 'text' && <TextAnimation text={text} />}
        {type === 'voice' && <VoiceAnimation progress={progress} />}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[480px] px-6 mb-6">
        <div
          className="w-full overflow-hidden rounded-full"
          style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className="h-full rounded-full transition-none"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6C63FF, #8B84FF)',
            }}
          />
        </div>
      </div>

      {/* Neural network dots */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="rounded-full transition-all duration-200"
            style={{
              width: 6,
              height: 6,
              background: 'var(--accent)',
              opacity: i === dotIndex ? 1 : 0.15,
            }}
          />
        ))}
      </div>

      {/* Cancel button */}
      <button
        onClick={handleCancel}
        className="text-xs uppercase tracking-[1.5px] transition-colors hover:text-[var(--text-secondary)]"
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 16px',
          minHeight: 44,
        }}
      >
        cancel
      </button>
    </div>
  );
}

// Image scan animation — scan beam + corner brackets
function ImageAnimation({ fileName, progress }) {
  const [beamY, setBeamY] = useState(0);

  useEffect(() => {
    let start = null;
    let raf;
    function animate(ts) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const cycle = 1500; // 1.5s per sweep
      const pct = (elapsed % cycle) / cycle;
      setBeamY(pct * 100);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const percentage = Math.round(progress);
  const log = percentage < 22
    ? 'Validating image upload'
    : percentage < 52
      ? 'Reading image pixels and metadata'
      : percentage < 82
        ? 'Running authenticity classifier'
        : 'Calibrating forensic confidence';

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Scanlines grid */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.03 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="w-full"
            style={{
              height: 1,
              background: 'white',
              marginTop: `${100 / 40}%`,
            }}
          />
        ))}
      </div>

      {/* Placeholder image area */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-32 h-32 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
        >
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        {fileName && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {fileName}
          </span>
        )}
      </div>

      {/* Scan beam */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `${beamY}%`,
          height: 3,
          background: 'var(--accent)',
          boxShadow: '0 0 20px 6px rgba(108,99,255,0.7)',
          transition: 'none',
        }}
      />

      {/* Corner brackets */}
      <CornerBrackets />

      {/* Live scan log: intentionally generic because the backend model may
          analyse any image, not only a face. */}
      <div className="absolute bottom-4 left-4 right-4 rounded-lg px-3 py-2.5" style={{ background: 'rgba(8, 20, 16, .78)', border: '1px solid rgba(79, 209, 165, .2)', fontFamily: 'var(--font-mono)' }}>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[.14em]" style={{ color: 'var(--accent)' }}>
          <span>Forensic process log</span><span>{percentage}%</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-primary)' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
          {log}<AnimatedDots />
        </div>
      </div>
    </div>
  );
}

// Text scan animation — word-by-word highlight
function TextAnimation({ text }) {
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [checks, setChecks] = useState([false, false, false]);
  const words = useMemo(() => (text || 'Scanning message content for patterns...').split(' '), [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightIndex(prev => (prev + 1) % words.length);
    }, 60);
    return () => clearInterval(interval);
  }, [words.length]);

  useEffect(() => {
    const t1 = setTimeout(() => setChecks([true, false, false]), 400);
    const t2 = setTimeout(() => setChecks([true, true, false]), 900);
    const t3 = setTimeout(() => setChecks([true, true, true]), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="w-full h-full flex flex-col p-5">
      {/* Text with word highlighting */}
      <div
        className="flex-1 overflow-hidden rounded-lg p-3 mb-4 text-xs leading-relaxed"
        style={{ background: 'var(--bg-tertiary)', fontFamily: 'var(--font-mono)' }}
      >
        {words.map((word, i) => (
          <span
            key={i}
            className="inline-block mr-1 px-0.5 rounded transition-all duration-75"
            style={{
              color: i === highlightIndex ? 'var(--text-primary)' : 'var(--text-tertiary)',
              background: i === highlightIndex ? 'rgba(108,99,255,0.3)' : 'transparent',
            }}
          >
            {word}
          </span>
        ))}
      </div>

      {/* Check items */}
      <div className="space-y-2">
        {[
          'Keyword pattern matching',
          'URL reputation check',
          'Scam DNA comparison',
        ].map((label, i) => (
          <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: checks[i] ? 'var(--safe)' : 'var(--text-tertiary)' }}>
              {checks[i] ? '✓' : '⟳'}
            </span>
            <span style={{ color: checks[i] ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
              {label}...
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Voice scan animation — waveform bars
function VoiceAnimation({ progress }) {
  const [bars, setBars] = useState(Array(10).fill(30));

  useEffect(() => {
    const interval = setInterval(() => {
      setBars(Array(10).fill(0).map(() => 15 + Math.random() * 85));
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const step = progress < 30 ? 'Validating audio and segmenting the recording' : progress < 60 ? 'Transcribing the conversation for scam-language analysis' : progress < 84 ? 'Checking scam intelligence and live web signals' : 'Fusing conversation and voice-authenticity evidence';
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6">
      {/* Waveform bars */}
      <div className="flex items-end gap-1.5 h-24">
        {bars.map((height, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: 6,
              height: `${height}%`,
              background: 'var(--accent)',
              opacity: 0.6 + (height / 100) * 0.4,
              minHeight: 4,
            }}
          />
        ))}
      </div>

      {/* Analysis text */}
      <span
        className="text-xs text-center"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}
      >
        {step}
        <AnimatedDots />
      </span>

      {/* Decorative spectrogram grid */}
      <div className="flex gap-px opacity-20">
        {Array.from({ length: 20 }).map((_, col) => (
          <div key={col} className="flex flex-col gap-px">
            {Array.from({ length: 8 }).map((_, row) => (
              <div
                key={row}
                className="rounded-sm"
                style={{
                  width: 4,
                  height: 4,
                  background: 'var(--accent)',
                  opacity: Math.random() > 0.5 ? 0.6 : 0.1,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Corner bracket decorations
function CornerBrackets() {
  const style = {
    position: 'absolute',
    width: 24,
    height: 24,
    border: '2px solid var(--accent)',
    opacity: 0.6,
  };

  return (
    <>
      <div style={{ ...style, top: 16, left: 16, borderRight: 'none', borderBottom: 'none', borderRadius: '4px 0 0 0' }} />
      <div style={{ ...style, top: 16, right: 16, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 4px 0 0' }} />
      <div style={{ ...style, bottom: 32, left: 16, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 4px' }} />
      <div style={{ ...style, bottom: 32, right: 16, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 4px 0' }} />
    </>
  );
}

// Animated dots "..."
function AnimatedDots() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const interval = setInterval(() => setCount(p => (p % 3) + 1), 400);
    return () => clearInterval(interval);
  }, []);
  return <span>{'.'.repeat(count)}</span>;
}
