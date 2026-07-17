import { useEffect, useMemo, useState } from 'react';
import { Activity } from 'lucide-react';

/** A short rotating activity line derived entirely from persisted map records. */
export default function StateActivityLog({ cityStats = [], mapPoints = [] }) {
  const entries = useMemo(() => {
    const fromStats = cityStats
      .filter(item => item?.city && Number.isFinite(Number(item.total)))
      .sort((a, b) => Number(b.total) - Number(a.total))
      .map(item => ({ place: item.city, total: Number(item.total) }));
    if (fromStats.length) return fromStats;
    const totals = mapPoints.reduce((all, point) => {
      const place = point.area || 'Malaysia';
      all[place] = (all[place] || 0) + Number(point.count || 1);
      return all;
    }, {});
    return Object.entries(totals).map(([place, total]) => ({ place, total })).sort((a, b) => b.total - a.total);
  }, [cityStats, mapPoints]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    if (entries.length < 2) return undefined;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % entries.length), 2000);
    return () => window.clearInterval(timer);
  }, [entries.length]);
  const entry = entries[index];
  if (!entry) return null;
  return <div aria-live="polite" style={{display:'flex',alignItems:'center',gap:'9px',marginTop:'12px',padding:'10px 12px',borderRadius:'10px',background:'var(--bg-tertiary)',border:'1px solid var(--border)',color:'var(--text-secondary)'}}>
    <Activity size={14} style={{color:'var(--accent)',flex:'0 0 auto'}} />
    <span key={`${entry.place}-${index}`} style={{fontSize:'11px',animation:'stateLogFade 260ms ease both'}}><strong style={{color:'var(--text-primary)'}}>{entry.place}</strong> · {entry.total.toLocaleString()} report signal{entry.total === 1 ? '' : 's'} in DJAGA intelligence</span>
    <style>{'@keyframes stateLogFade{from{opacity:.15;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}'}</style>
  </div>;
}
