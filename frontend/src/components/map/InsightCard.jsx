import { useState } from 'react';

const SEVERITY_COLORS = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#3B82F6',
  low: '#10B981',
};

const TREND_CONFIG = {
  rising:  { arrow: '↑', color: '#EF4444' },
  stable:  { arrow: '→', color: '#F59E0B' },
  falling: { arrow: '↓', color: '#10B981' },
};

export default function InsightCard({ insight, index, isHighlighted }) {
  const [expanded, setExpanded] = useState(false);

  const sevColor = SEVERITY_COLORS[insight.severity] || 'var(--text-tertiary)';
  const trend = TREND_CONFIG[insight.trend] || TREND_CONFIG.stable;

  const timeAgo = (() => {
    const diff = Date.now() - new Date(insight.generatedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  })();

  return (
    <div
      style={{
        background: isHighlighted ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
        border: `1px solid ${isHighlighted ? 'var(--accent-border)' : 'var(--border)'}`,
        borderLeft: `4px solid ${sevColor}`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '10px',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        cursor: 'default',
        animation: `insightSlideIn 0.5s ease ${index * 0.1}s both`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,99,255,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top row: severity + confidence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
          padding: '2px 10px', borderRadius: '999px',
          background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}30`,
        }}>
          {insight.severity}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: "'Space Mono', monospace" }}>
            AI Confidence: {insight.confidence}%
          </span>
          <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            <div style={{ width: `${insight.confidence}%`, height: '100%', borderRadius: '2px', background: 'var(--accent)' }} />
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)',
        fontFamily: "'Syne', sans-serif", marginBottom: '6px',
      }}>
        {insight.title}
      </div>

      {/* Body */}
      <div style={{
        fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6,
        overflow: 'hidden', maxHeight: expanded ? '500px' : '54px',
        transition: 'max-height 0.4s ease',
      }}>
        {insight.body}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '10px 0' }} />

      {/* Area + affected */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{
          fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
          background: 'var(--accent-dim)', color: 'var(--accent)', fontWeight: 500,
        }}>
          📍 {insight.affectedArea}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: "'Space Mono', monospace" }}>
          {insight.affectedCount.toLocaleString()} affected
        </span>
      </div>

      {/* Trend + Tags */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {insight.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '9px', padding: '1px 8px', borderRadius: '999px',
              background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
              border: '1px solid var(--border)',
            }}>
              #{tag}
            </span>
          ))}
        </div>
        <span style={{
          fontSize: '11px', fontWeight: 600, color: trend.color,
          fontFamily: "'Space Mono', monospace",
        }}>
          {trend.arrow} {insight.trend}
        </span>
      </div>

      {/* Recommendation */}
      {expanded && (
        <div style={{
          padding: '10px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          marginBottom: '8px',
          animation: 'fadeIn 0.3s ease',
        }}>
          <span style={{ fontSize: '11px', fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            💡 {insight.recommendation}
          </span>
        </div>
      )}

      {/* Bottom */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: "'Space Mono', monospace" }}>
          {timeAgo}
        </span>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
          }}
        >
          {expanded ? '↑ Show less' : 'Read more ↓'}
        </button>
      </div>
    </div>
  );
}
