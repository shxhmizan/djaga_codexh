import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../hooks/useTranslation';

const STATS_CONFIG = [
  { key: 'totalReportsToday', labelKey: 'map.reportsToday', color: 'var(--accent)', format: v => v.toLocaleString() },
  { key: 'activeAlerts', labelKey: 'map.activeAlerts', color: 'var(--threat)', format: v => v.toString() },
  { key: 'newSinceYesterday', labelKey: 'map.newToday', color: 'var(--warning)', format: v => `+${v}` },
  { key: 'mostAffectedCity', labelKey: 'map.mostAffected', color: 'var(--threat)', format: v => v, isText: true },
  { key: 'aiScansToday', labelKey: 'map.aiScans', color: 'var(--safe)', format: v => v.toLocaleString() },
];

function AnimatedNumber({ target, color, format, isText }) {
  const [display, setDisplay] = useState(isText ? target : 0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (isText) { setDisplay(target); return; }
    const start = performance.now();
    const duration = 1500;
    const ease = t => 1 - Math.pow(1 - t, 4);

    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(Math.floor(ease(progress) * target));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [target, isText]);

  return (
    <span style={{ fontSize: '22px', fontFamily: "'Syne', sans-serif", fontWeight: 800, color }}>
      {isText ? display : format(display)}
    </span>
  );
}

export default function LiveStats({ stats }) {
  const data = stats || {};
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      padding: '14px 24px',
      borderRadius: '16px 16px 0 0',
    }}>
      {STATS_CONFIG.map(cfg => (
        <div key={cfg.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '100px', flex: 1 }}>
          <AnimatedNumber
            target={data[cfg.key] ?? (cfg.isText ? '—' : 0)}
            color={cfg.color}
            format={cfg.format}
            isText={cfg.isText}
          />
          <span style={{
            fontSize: '10px',
            fontFamily: "'Space Mono', monospace",
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            marginTop: '4px',
            letterSpacing: '0.5px',
          }}>
            {t(cfg.labelKey)}
          </span>
        </div>
      ))}
    </div>
  );
}
