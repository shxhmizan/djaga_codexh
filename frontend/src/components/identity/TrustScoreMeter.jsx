import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Check, Clock, Minus } from 'lucide-react';
import { TRUST_BREAKDOWN } from '../../data/dummyTrustScore';

export default function TrustScoreMeter() {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const data = TRUST_BREAKDOWN;

  // Animate score count-up
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    let raf;
    function animate() {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(data.total * eased));
      if (t < 1) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [data.total]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const pct = animatedScore / data.maxPossible;
  const offset = circumference - pct * circumference;
  const svgSize = 200;
  const center = svgSize / 2;

  // Get band color
  const getBandColor = (score) => {
    if (score >= 800) return 'var(--safe)';
    if (score >= 600) return 'var(--accent)';
    if (score >= 400) return 'var(--warning)';
    return 'var(--threat)';
  };

  const statusIcon = (status) => {
    if (status === 'pass') return <Check size={12} style={{ color: 'var(--safe)' }} />;
    if (status === 'partial') return <Clock size={12} style={{ color: 'var(--warning)' }} />;
    return <Minus size={12} style={{ color: 'var(--text-tertiary)' }} />;
  };

  return (
    <div>
      {/* Main gauge */}
      <div className="flex flex-col items-center mb-8">
        <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
          <circle
            cx={center} cy={center} r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)',
              filter: 'drop-shadow(0 0 12px rgba(108,99,255,0.4))',
            }}
          />
          <text x={center} y={center - 10} textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-primary)" style={{ fontFamily: 'var(--font-display)', fontSize: '40px', fontWeight: 800 }}>
            {animatedScore}
          </text>
          <text x={center} y={center + 14} textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-tertiary)" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            / {data.maxPossible}
          </text>
          <text x={center} y={center + 34} textAnchor="middle" dominantBaseline="middle"
            fill={getBandColor(animatedScore)} style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 600 }}>
            {data.band}
          </text>
        </svg>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3 mb-8">
        {data.categories.map((cat, i) => {
          const isExpanded = expandedCategory === i;
          const catPct = (cat.score / cat.max) * 100;

          return (
            <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left min-h-[44px]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {cat.name}
                    </span>
                    <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {cat.score}/{cat.max}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${catPct}%`,
                        background: cat.color,
                        boxShadow: `0 0 8px ${cat.color}40`,
                      }}
                    />
                  </div>
                </div>
                <div className="ml-3" style={{ color: 'var(--text-tertiary)' }}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-2" style={{ animation: 'fadeIn 0.2s ease' }}>
                  {cat.items.map((item, j) => (
                    <div key={j} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        {statusIcon(item.status)}
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                        {item.pts}/{item.max}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score history chart */}
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
          Score History
        </h4>
        <ScoreHistoryChart data={data.history} />
      </div>
    </div>
  );
}

function ScoreHistoryChart({ data }) {
  const width = 320;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 24, left: 35 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minScore = Math.min(...data.map(d => d.score)) - 30;
  const maxScore = Math.max(...data.map(d => d.score)) + 30;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-[400px]">
      {/* Grid lines */}
      {[0, 0.5, 1].map((t, i) => {
        const y = padding.top + chartH * (1 - t);
        const score = Math.round(minScore + (maxScore - minScore) * t);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            <text x={padding.left - 6} y={y + 4} textAnchor="end" fill="var(--text-tertiary)" style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
              {score}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: 'drop-shadow(0 0 6px rgba(108,99,255,0.4))' }} />

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="5" fill="var(--bg-primary)" stroke="var(--accent)" strokeWidth="2.5" />
          <text x={p.x} y={height - 4} textAnchor="middle" fill="var(--text-tertiary)"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}>
            {p.date.split('-')[1]}
          </text>
        </g>
      ))}
    </svg>
  );
}
