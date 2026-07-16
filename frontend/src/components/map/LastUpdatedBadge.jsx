import { useState, useEffect } from 'react';

export default function LastUpdatedBadge() {
  const [now, setNow] = useState(new Date());
  const [lastUpdate] = useState(new Date(Date.now() - 3 * 60000));

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ', ' + date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const timeSince = Math.floor((now - lastUpdate) / 1000);
  const minutesSince = Math.floor(timeSince / 60);
  const secondsSince = timeSince % 60;
  const sinceText = minutesSince > 0
    ? `${minutesSince}m ${secondsSince}s ago`
    : `${secondsSince}s ago`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      background: 'var(--safe-dim)',
      border: '1px solid var(--safe-border)',
      borderRadius: '8px',
      padding: '10px 14px',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: 'var(--safe)',
        flexShrink: 0,
        marginTop: '4px',
        animation: 'livePulse 1.5s ease infinite',
      }} />
      <div>
        <div style={{
          fontSize: '11px',
          fontFamily: "'Space Mono', monospace",
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Last updated: {sinceText}
        </div>
        <div style={{
          fontSize: '12px',
          fontFamily: "'Space Mono', monospace",
          color: 'var(--text-primary)',
          letterSpacing: '0.3px',
          marginTop: '2px',
        }}>
          {formatDate(now)}
        </div>
      </div>
    </div>
  );
}
