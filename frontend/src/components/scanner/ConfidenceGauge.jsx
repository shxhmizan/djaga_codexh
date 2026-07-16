import { useEffect, useState, useRef } from 'react';

export default function ConfidenceGauge({ value = 0, color = 'var(--accent)', size = 140, label = '' }) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [displayNumber, setDisplayNumber] = useState(0);
  const animRef = useRef(null);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const svgSize = size;
  const center = svgSize / 2;

  // Animate gauge on mount
  useEffect(() => {
    const startTime = Date.now();
    const duration = 1200;

    function animate() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Spring-like easing: cubic-bezier(0.34, 1.56, 0.64, 1)
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      // slight overshoot
      const overshoot = t < 1 ? eased * 1.03 : 1;
      const current = Math.min(value * overshoot, 100);

      setAnimatedValue(current);
      setDisplayNumber(Math.round(current * (value / 100)));

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatedValue(value);
        setDisplayNumber(Math.round(value * 10) / 10);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value]);

  const isThreat = color === 'var(--threat)' || color === '#EF4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            filter: `drop-shadow(0 0 8px ${isThreat ? 'rgba(239,68,68,0.5)' : 'rgba(108,99,255,0.5)'})`,
          }}
        />
        {/* Center text */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-primary)"
          style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800 }}
        >
          {typeof displayNumber === 'number' ? displayNumber.toFixed(1) : displayNumber}
        </text>
        <text
          x={center}
          y={center + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--text-tertiary)"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          CONFIDENCE
        </text>
      </svg>
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
