import InsightCard from './InsightCard';
import LastUpdatedBadge from './LastUpdatedBadge';
import CityRankingList from './CityRankingList';
import { AI_INSIGHTS } from '../../data/dummyAIInsights';
import { useTranslation } from '../../hooks/useTranslation';

export default function AIInsightsPanel({ activeFilter }) {
  const highlightedTags = activeFilter === 'all' ? [] : [activeFilter];
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border)',
      borderRadius: '0 16px 16px 0',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <h2 style={{
            fontSize: '18px',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {t('map.aiInsights')}
          </h2>
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '999px',
            background: 'var(--accent)',
            color: '#FFFFFF',
          }}>
            🤖 DJAGA AI
          </span>
        </div>
        <p style={{
          fontSize: '11px',
          color: 'var(--text-tertiary)',
          margin: '2px 0 12px',
        }}>
          {t('map.poweredBy')}
        </p>
        <LastUpdatedBadge />
        <p style={{
          fontSize: '11px',
          fontFamily: "'Space Mono', monospace",
          color: 'var(--text-tertiary)',
          margin: '8px 0 16px',
        }}>
          {t('map.analysed')}
        </p>
      </div>

      {/* Insight cards — scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 20px',
        scrollbarWidth: 'none',
      }}>
        <div className="no-scrollbar" style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
          {AI_INSIGHTS.map((insight, i) => {
            const isHighlighted = highlightedTags.length > 0 &&
              insight.tags.some(tag => highlightedTags.some(ft => tag.includes(ft)));
            return (
              <InsightCard
                key={insight.id}
                insight={insight}
                index={i}
                isHighlighted={isHighlighted}
              />
            );
          })}
        </div>

        {/* City Ranking */}
        <CityRankingList activeFilter={activeFilter} />
      </div>
    </div>
  );
}
