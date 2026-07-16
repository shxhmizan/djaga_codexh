import ScamAlert from './ScamAlert';
import { useTranslation } from '../../hooks/useTranslation';

export default function ScamFeed({ alerts = [], maxItems }) {
  const displayAlerts = maxItems ? alerts.slice(0, maxItems) : alerts;
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {displayAlerts.map(alert => (
        <ScamAlert key={alert.id} alert={alert} />
      ))}
      {displayAlerts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {t('feed.noAlerts')}
          </p>
        </div>
      )}
    </div>
  );
}
