import { LocateFixed } from 'lucide-react';
export default function MapControls({ activeFilter, onFilterChange, showHeatmap, onToggleHeatmap, showMarkers, onToggleMarkers, onLocate, locating, locationError, scamTypes = [] }) {
  const allTypes = [
    { id: 'all', label: 'All Types', emoji: '🗺️' },
    ...scamTypes,
  ];
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '12px 0',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '190px' }}>
        <select value={activeFilter} onChange={event => onFilterChange(event.target.value)} aria-label="Filter scam type" style={{ width: '100%', maxWidth: '220px', padding: '10px 34px 10px 12px', borderRadius: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', fontSize: '12px', outline: 'none' }}>
          {allTypes.map(type => <option value={type.id} key={type.id}>{type.emoji} {type.label}</option>)}
        </select>
        <button onClick={onLocate} disabled={locating} title="Use my location" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', borderRadius: '10px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)', cursor: locating ? 'wait' : 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}><LocateFixed size={15}/>{locating ? 'Locating…' : 'My location'}</button>
      </div>

      {/* Toggles */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
        <ToggleSwitch label="Heatmap" active={showHeatmap} onToggle={onToggleHeatmap} />
        <ToggleSwitch label="Markers" active={showMarkers} onToggle={onToggleMarkers} />
      </div>
      {locationError && <p style={{ width: '100%', margin: 0, fontSize: '11px', color: 'var(--warning)' }}>{locationError}</p>}
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
