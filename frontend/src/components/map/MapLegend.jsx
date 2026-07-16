export default function MapLegend({ scamTypes = [] }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      padding: '12px 16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      alignItems: 'center',
      marginTop: '8px',
    }}>
      {/* Intensity gradient */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
        <span style={{ fontSize: '11px', fontFamily: "'Space Mono', monospace", color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
          Intensity
        </span>
        <div style={{
          width: '120px',
          height: '8px',
          borderRadius: '4px',
          background: 'linear-gradient(to right, rgba(34,197,94,0.7), rgba(245,158,11,0.8), rgba(239,68,68,0.8), rgba(139,92,246,0.95))',
        }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {['Low', 'Med', 'High', 'Crit'].map(l => (
            <span key={l} style={{ fontSize: '9px', fontFamily: "'Space Mono', monospace", color: 'var(--text-tertiary)' }}>{l}</span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

      {/* Scam type chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {scamTypes.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: t.color, display: 'inline-block',
            }} />
            <span style={{
              fontSize: '10px', fontFamily: "'Inter', sans-serif",
              color: 'var(--text-secondary)', whiteSpace: 'nowrap',
            }}>
              {t.label.split(' /')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
