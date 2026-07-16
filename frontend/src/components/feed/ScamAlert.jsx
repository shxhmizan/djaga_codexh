import { useState } from 'react';
import { AlertTriangle, Phone, MapPin, Calendar, Share2, CheckCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import { useTranslation } from '../../hooks/useTranslation';

export default function ScamAlert({ alert }) {
  const [expanded, setExpanded] = useState(false);
  const { t, lang } = useTranslation();

  // Helper: resolve bilingual field (string or { en, ms } object)
  const loc = (field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[lang] || field.en || '';
  };

  const severityConfig = {
    critical: { color: 'var(--threat)', bg: 'var(--threat)', labelKey: 'feed.severity.critical', type: 'threat' },
    high: { color: 'var(--warning)', bg: 'var(--warning)', labelKey: 'feed.severity.high', type: 'warning' },
    medium: { color: '#FBBF24', bg: '#FBBF24', labelKey: 'feed.severity.medium', type: 'warning' },
    low: { color: 'var(--teal)', bg: 'var(--teal)', labelKey: 'feed.severity.low', type: 'teal' },
  };

  const severity = severityConfig[alert.severity] || severityConfig.medium;
  const title = loc(alert.title);
  const description = loc(alert.description);
  const area = loc(alert.area);
  const source = loc(alert.source);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex">
        {/* Severity bar */}
        <div className="w-1 flex-shrink-0" style={{ background: severity.bg }} />

        <div className="flex-1 p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} style={{ color: severity.color }} />
                <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  {title}
                </h4>
              </div>
              <p
                className={`text-xs leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}
                style={{ color: 'var(--text-secondary)' }}
              >
                {description}
              </p>
              {description.length > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs mt-1 hover:underline"
                  style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 44 }}
                >
                  {expanded ? t('feed.showLess') : t('feed.readMore')}
                </button>
              )}
            </div>
            <Badge type={severity.type}>{t(severity.labelKey)}</Badge>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
              <MapPin size={10} /> {area}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-tertiary)' }}>
              {alert.type.replace('_', ' ')}
            </span>
            {alert.verified && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(34,197,94,0.08)', color: '#86EFAC' }}>
                <CheckCircle size={10} /> {t('feed.verified')}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            <div className="flex items-center gap-3">
              <span>{alert.reportCount} {t('feed.reports')}</span>
              <span className="flex items-center gap-1">
                <Calendar size={10} /> {alert.date}
              </span>
            </div>
            <button
              className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] min-w-[44px] min-h-[44px] flex items-center justify-center"
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <Share2 size={14} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
