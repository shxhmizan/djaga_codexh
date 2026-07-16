import { useState, useEffect, useMemo } from 'react';
import LeafletMap from './LeafletMap';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import AIInsightsPanel from './AIInsightsPanel';
import LiveStats from './LiveStats';
import { SCAM_POINTS } from '../../data/dummyMapData';
import { LIVE_STATS } from '../../data/dummyAIInsights';
import { useApp } from '../../context/AppContext';

export default function ScamHeatmap() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [liveStats, setLiveStats] = useState({ ...LIVE_STATS });
  const [feedPoints, setFeedPoints] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const { addToast, theme } = useApp();

  useEffect(() => {
    const typeFor = (type) => {
      const value = type.toLowerCase();
      if (value.includes('cloned') || value.includes('voice')) return 'deepfake';
      if (value.includes('investment')) return 'invest'; if (value.includes('romance')) return 'love';
      if (value.includes('phish')) return 'phish'; if (value.includes('macau')) return 'macau'; return 'job';
    };
    fetch('/api/feed', { credentials: 'include' }).then(response => response.ok ? response.json() : []).then(items => {
      const points = items.map((item, index) => ({ lat: item.lat, lng: item.lng, type: typeFor(item.scam_type), count: 1, area: item.region, date: item.date, title: item.title, id: `${item.region}-${index}` }));
      setFeedPoints(points);
      if (points.length) {
        const grouped = points.reduce((acc, point) => ({ ...acc, [point.area]: (acc[point.area] || 0) + 1 }), {});
        const mostAffectedCity = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0][0];
        setLiveStats(prev => ({ ...prev, totalReportsToday: points.length, activeAlerts: points.length, newSinceYesterday: points.length, mostAffectedCity }));
      }
    }).catch(() => {});
  }, []);
  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationError('Location is not supported by this browser.'); return; }
    setLocating(true); setLocationError('');
    navigator.geolocation.getCurrentPosition(position => { setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocating(false); }, () => { setLocationError('Location permission was not granted. You can enable it in browser settings.'); setLocating(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  };
  // Keep the nationwide intelligence layer visible while adding freshly harvested feed records.
  const mapPoints = useMemo(() => [...SCAM_POINTS, ...feedPoints], [feedPoints]);
  // Filter points by scam type
  const filteredPoints = useMemo(() => {
    if (activeFilter === 'all') return mapPoints;
    return mapPoints.filter(p => p.type === activeFilter);
  }, [activeFilter, mapPoints]);

  // Generate heatmap data from filtered points
  const heatmapData = useMemo(() => {
    return filteredPoints.map(p => [p.lat, p.lng, Math.min(p.count / 50, 1.0)]);
  }, [filteredPoints]);

  // Auto-refresh simulation every 30 seconds
  useEffect(() => {
    const areas = mapPoints.map(p => p.area);
    const interval = setInterval(() => {
      const randomArea = areas[Math.floor(Math.random() * areas.length)];
      const increment = Math.floor(Math.random() * 5) + 1;

      setLiveStats(prev => ({
        ...prev,
        totalReportsToday: prev.totalReportsToday + increment,
        newSinceYesterday: prev.newSinceYesterday + increment,
      }));

      if (addToast) {
        addToast({ message: `🚨 New scam alert reported in ${randomArea}`, type: 'warning' });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [addToast, mapPoints]);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '20px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      {/* Scoped CSS for map component */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.7; }
        }
        @keyframes markerDrop {
          from { transform: translateY(-20px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes insightSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .djaga-popup .leaflet-popup-content-wrapper {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(108,99,255,0.15);
          padding: 0;
          color: var(--text-primary);
        }
        .djaga-popup .leaflet-popup-tip {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
        }
        .djaga-popup .leaflet-popup-content {
          margin: 0;
          padding: 0;
        }
        .leaflet-container {
          font-family: 'Inter', sans-serif;
          background: #315849;
        }
        .leaflet-tile-pane {
          filter: saturate(1.15) contrast(1.04) brightness(1.05);
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .scam-heatmap-main {
          display: flex;
          flex-direction: row;
        }
        .scam-heatmap-map {
          flex: 0 0 65%;
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
        }
        .scam-heatmap-panel {
          flex: 0 0 35%;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          scrollbar-width: none;
        }
        .scam-heatmap-panel::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 1024px) {
          .scam-heatmap-main {
            flex-direction: column;
          }
          .scam-heatmap-map {
            flex: 1 1 auto;
          }
          .scam-heatmap-panel {
            flex: 1 1 auto;
            max-height: none;
          }
        }
      `}</style>

      {/* Live Stats Bar */}
      <LiveStats stats={liveStats} />

      {/* Main Content */}
      <div className="scam-heatmap-main">
        {/* Map Section */}
        <div className="scam-heatmap-map">
          <MapControls
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            showMarkers={showMarkers}
            onToggleMarkers={() => setShowMarkers(!showMarkers)}
            onLocate={requestLocation}
            locating={locating}
            locationError={locationError}
          />

          <div style={{ flex: 1, minHeight: '480px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <LeafletMap
              points={filteredPoints}
              heatmapData={heatmapData}
              showHeatmap={showHeatmap}
              showMarkers={showMarkers}
              theme={theme}
              userLocation={userLocation}
            />
          </div>

          <MapLegend />
        </div>

        {/* AI Insights Panel */}
        <div className="scam-heatmap-panel">
          <AIInsightsPanel activeFilter={activeFilter} />
        </div>
      </div>
    </div>
  );
}
