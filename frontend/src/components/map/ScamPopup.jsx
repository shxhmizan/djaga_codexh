export default function ScamPopup({ point, scamTypes = [] }) {
  if (!point) return null;

  const typeData = scamTypes.find(type => type.id === point.type) || {};
  const daysAgo = Math.floor((Date.now() - new Date(point.date).getTime()) / 86400000);
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;

  const severityPct = Math.min(point.count / 50, 1);
  const severityLabel = severityPct >= 0.8 ? 'Critical' : severityPct >= 0.5 ? 'High' : severityPct >= 0.3 ? 'Medium' : 'Low';
  const severityColor = severityPct >= 0.8 ? '#EF4444' : severityPct >= 0.5 ? '#F59E0B' : severityPct >= 0.3 ? '#3B82F6' : '#10B981';

  const handleShare = () => {
    const text = `⚠️ Scam alert in ${point.area}: ${typeData.label}. Stay safe! — DJAGA`;
    navigator.clipboard?.writeText(text);
  };

  return (
    <div style={{ width: '260px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E6FF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '18px' }}>{typeData.emoji}</span>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: '999px',
            background: `${typeData.color}15`,
            color: typeData.color,
            border: `1px solid ${typeData.color}30`,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {typeData.label}
          </span>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F0E1A' }}>{point.area}</div>
        <div style={{ fontSize: '11px', color: '#9090B0' }}>Malaysia</div>
      </div>

      {/* Stats */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #E8E6FF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F0E1A' }}>{point.count}</span>
          <span style={{ fontSize: '11px', color: '#9090B0', marginLeft: '4px' }}>reports</span>
        </div>
        <span style={{ fontSize: '11px', color: '#9090B0' }}>{timeLabel}</span>
      </div>

      {/* Severity bar */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #E8E6FF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: '#9090B0', textTransform: 'uppercase', fontFamily: "'Space Mono', monospace" }}>Severity</span>
          <span style={{ fontSize: '10px', fontWeight: 600, color: severityColor }}>{severityLabel}</span>
        </div>
        <div style={{ height: '4px', borderRadius: '2px', background: '#F2F1FE', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${severityPct * 100}%`,
            borderRadius: '2px',
            background: severityColor,
            transition: 'width 0.5s ease',
          }} />
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '10px 16px 8px', fontSize: '11px', color: '#4A4A6A', lineHeight: 1.5 }}>
        {typeData.description}
      </div>

      {/* Actions */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', gap: '8px' }}>
        <button style={{
          flex: 1,
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '8px',
          border: '1px solid #6C63FF',
          background: '#6C63FF',
          color: '#FFFFFF',
          cursor: 'pointer',
        }}>
          View full report
        </button>
        <button
          onClick={handleShare}
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '8px',
            border: '1px solid #E8E6FF',
            background: '#FFFFFF',
            color: '#4A4A6A',
            cursor: 'pointer',
          }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
