import { useState, useEffect } from 'react';

export default function KeywordPills({ keywords = [], type = 'threat' }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (keywords.length === 0) return;
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= keywords.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [keywords]);

  const pillStyle = type === 'threat' ? {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    color: '#FCA5A5',
  } : {
    background: 'rgba(34,197,94,0.1)',
    border: '1px solid rgba(34,197,94,0.2)',
    color: '#86EFAC',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {keywords.map((keyword, i) => (
        <span
          key={i}
          className="inline-block rounded-full text-xs font-medium transition-all duration-200"
          style={{
            ...pillStyle,
            padding: '4px 14px',
            fontSize: '12px',
            borderRadius: '999px',
            opacity: i < visibleCount ? 1 : 0,
            transform: i < visibleCount ? 'translateX(0)' : 'translateX(20px)',
            transition: 'all 0.2s ease',
          }}
        >
          {keyword}
        </span>
      ))}
    </div>
  );
}
