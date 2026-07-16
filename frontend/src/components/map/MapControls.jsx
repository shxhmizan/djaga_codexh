import { SCAM_TYPES } from '../../data/dummyMapData';

const allTypes = [
  { key: 'all', label: 'All Types', emoji: '🗺️', color: 'var(--accent)' },
  ...Object.entries(SCAM_TYPES).map(([key, v]) => ({ key, label: v.label.split(' /')[0].split(' ')[0], emoji: v.emoji, color: v.color })),
];

export default function MapControls({ activeFilter, onFilterChange, showHeatmap, onToggleHeatmap, showMarkers, onToggleMarkers }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '12px 0',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Filter buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
        {allTypes.map(t => {
          const isActive = activeFilter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onFilterChange(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                borderRadius: '999px',
                border: `1px solid ${isActive ? t.color : 'var(--border)'}`,
                background: isActive ? t.color : 'var(--bg-secondary)',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '12px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '13px' }}>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        <ToggleSwitch label="Heatmap" active={showHeatmap} onToggle={onToggleHeatmap} />
        <ToggleSwitch label="Markers" active={showMarkers} onToggle={onToggleMarkers} />
      </div>
    </div>
  );
}

function ToggleSwitch({ label, active, onToggle }) {
  return (
    <label style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      fontFamily: "'Space Mono', monospace",
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      userSelect: 'none',
    }}>
      <div
        onClick={onToggle}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          background: active ? 'var(--accent)' : 'var(--bg-tertiary)',
          position: 'relative',
          transition: 'background 0.2s ease',
          cursor: 'pointer',
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#FFFFFF',
          position: 'absolute',
          top: '2px',
          left: active ? '18px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      {label}
    </label>
  );
}
