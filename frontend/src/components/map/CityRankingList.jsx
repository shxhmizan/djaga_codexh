import { useState, useEffect } from 'react';
import { CITY_STATS, SCAM_TYPES, SCAM_POINTS } from '../../data/dummyMapData';
import { useTranslation } from '../../hooks/useTranslation';

export default function CityRankingList({ activeFilter }) {
  const [animated, setAnimated] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const stats = activeFilter === 'all'
    ? CITY_STATS
    : (() => {
        const cityBounds = {
          'Kuala Lumpur': { latMin: 3.05, latMax: 3.25, lngMin: 101.55, lngMax: 101.80 },
          'Selangor': { latMin: 2.90, latMax: 3.25, lngMin: 101.35, lngMax: 101.85 },
          'Penang': { latMin: 5.30, latMax: 5.55, lngMin: 100.20, lngMax: 100.45 },
          'Johor Bahru': { latMin: 1.40, latMax: 1.56, lngMin: 103.60, lngMax: 103.85 },
          'Ipoh': { latMin: 4.45, latMax: 4.70, lngMin: 101.00, lngMax: 101.20 },
          'Kota Kinabalu': { latMin: 5.80, latMax: 6.10, lngMin: 116.00, lngMax: 117.30 },
          'Kuching': { latMin: 1.50, latMax: 3.40, lngMin: 110.20, lngMax: 113.20 },
          'Melaka': { latMin: 2.10, latMax: 2.25, lngMin: 102.20, lngMax: 102.30 },
        };
        return Object.entries(cityBounds).map(([city, b]) => {
          const pts = SCAM_POINTS.filter(
            p => p.type === activeFilter && p.lat >= b.latMin && p.lat <= b.latMax && p.lng >= b.lngMin && p.lng <= b.lngMax
          );
          return { city, total: pts.reduce((s, p) => s + p.count, 0), topType: activeFilter, rank: 0 };
        })
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .map((c, i) => ({ ...c, rank: i + 1 }));
      })();

  const maxTotal = Math.max(...stats.map(s => s.total), 1);

  return (
    <div style={{ padding: '16px 0' }}>
      <h3 style={{
        fontSize: '14px',
        fontFamily: "'Syne', sans-serif",
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '12px',
      }}>
        {t('map.mostAffectedCities')}
      </h3>

      {stats.map((city, i) => {
        const typeData = SCAM_TYPES[city.topType];
        const barWidth = animated ? `${(city.total / maxTotal) * 100}%` : '0%';

        return (
          <div
            key={city.city}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '4px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px', fontFamily: "'Space Mono', monospace",
                  color: 'var(--text-tertiary)', minWidth: '20px',
                }}>
                  #{city.rank}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {city.city}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: "'Inter', sans-serif" }}>
                  {city.total} {t('map.reports')}
                </span>
                {typeData && (
                  <span style={{
                    fontSize: '8px', padding: '1px 6px', borderRadius: '999px',
                    background: `${typeData.color}15`, color: typeData.color,
                    fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {typeData.emoji}
                  </span>
                )}
              </div>
            </div>
            <div style={{
              height: '4px', borderRadius: '2px',
              background: 'var(--bg-tertiary)', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', width: barWidth, borderRadius: '2px',
                background: 'var(--accent)',
                transition: `width 0.8s ease ${i * 0.1}s`,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
