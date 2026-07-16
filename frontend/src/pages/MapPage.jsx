import ScamHeatmap from '../components/map/ScamHeatmap';
import { useTranslation } from '../hooks/useTranslation';

export default function MapPage() {
  const { t } = useTranslation();

  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '24px 20px 40px',
    }}>
      {/* Page header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '28px',
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          color: 'var(--text-primary)',
          marginBottom: '6px',
        }}>
          {t('map.title')}
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          {t('map.subtitle')}
        </p>
      </div>

      <ScamHeatmap />
    </div>
  );
}
