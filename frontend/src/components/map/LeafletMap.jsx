import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix Leaflet marker icons in Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const TILE_LAYERS = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
  },
  dark: {
    // Brighter CARTO base keeps Malaysian geography legible within DJAGA's dark surface.
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

const MAP_CONFIG = {
  center: [4.2105, 108.9758],
  zoom: 5,
  minZoom: 4,
  maxZoom: 16,
};

const HEATMAP_CONFIG = {
  radius: 35,
  blur: 25,
  maxZoom: 12,
  max: 1.0,
  gradient: {
    0.0: 'transparent',
    0.3: 'rgba(34,197,94,0.7)',
    0.5: 'rgba(245,158,11,0.8)',
    0.7: 'rgba(239,68,68,0.8)',
    1.0: 'rgba(139,92,246,0.95)',
  },
  minOpacity: 0.3,
};

function createDivIcon(type, scamTypes) {
  const meta = scamTypes[type];
  if (!meta) return L.divIcon({ className: 'custom-marker', html: '<div>📍</div>' });

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px; height: 32px;
        border-radius: 50%;
        background: #FFFFFF;
        border: 3px solid ${meta.color};
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        animation: markerDrop 0.4s ease both;
      ">
        ${meta.emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

function buildPopupHTML(point, scamTypes) {
  const typeData = scamTypes[point.type] || {};
  const daysAgo = Math.floor((Date.now() - new Date(point.date).getTime()) / 86400000);
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
  const severityPct = Math.min(point.count / 50, 1);
  const severityLabel = severityPct >= 0.8 ? 'Critical' : severityPct >= 0.5 ? 'High' : severityPct >= 0.3 ? 'Medium' : 'Low';
  const severityColor = severityPct >= 0.8 ? '#EF4444' : severityPct >= 0.5 ? '#F59E0B' : severityPct >= 0.3 ? '#3B82F6' : '#10B981';

  return `
    <div style="width:260px;font-family:'Inter',sans-serif">
      <div style="padding:14px 16px 10px;border-bottom:1px solid rgba(207,255,234,.20)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">${typeData.emoji || '📍'}</span>
          <span style="font-size:10px;font-weight:600;padding:2px 10px;border-radius:999px;background:${typeData.color}15;color:${typeData.color};border:1px solid ${typeData.color}30;text-transform:uppercase;letter-spacing:0.5px">
            ${typeData.label || point.type}
          </span>
        </div>
        <div style="font-size:15px;font-weight:700;color:#F4FFF9">${point.area}</div>
        <div style="font-size:11px;color:#B7C9C0">Malaysia</div>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid rgba(207,255,234,.20);display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="font-size:18px;font-weight:700;color:#F4FFF9">${point.count}</span>
          <span style="font-size:11px;color:#B7C9C0;margin-left:4px">reports</span>
        </div>
        <span style="font-size:11px;color:#B7C9C0">${timeLabel}</span>
      </div>
      <div style="padding:10px 16px;border-bottom:1px solid rgba(207,255,234,.20)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:10px;color:#B7C9C0;text-transform:uppercase;font-family:'Space Mono',monospace">Severity</span>
          <span style="font-size:10px;font-weight:600;color:${severityColor}">${severityLabel}</span>
        </div>
        <div style="height:4px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden">
          <div style="height:100%;width:${severityPct * 100}%;border-radius:2px;background:${severityColor};transition:width 0.5s ease"></div>
        </div>
      </div>
      <div style="padding:10px 16px 8px;font-size:11px;color:#D3E3D9;line-height:1.5">
        ${typeData.description || ''}
      </div>
      <div style="padding:8px 16px 14px;display:flex;gap:8px">
        <button class="djaga-view-report" data-report-id="${String(point.reportId || '')}" style="flex:1;text-align:center;padding:6px 12px;font-size:11px;font-weight:700;border-radius:8px;border:1px solid #4FD1A5;background:#4FD1A5;color:#082017;cursor:pointer;text-decoration:none">
          View full report
        </button>
        <button onclick="navigator.clipboard.writeText('⚠️ Scam alert in ${point.area}: ${typeData.label}. Stay safe! — DJAGA')" style="padding:6px 12px;font-size:11px;font-weight:700;border-radius:8px;border:1px solid rgba(207,255,234,.32);background:rgba(255,255,255,.10);color:#F4FFF9;cursor:pointer">
          Share
        </button>
      </div>
    </div>
  `;
}

export default function LeafletMap({ points, heatmapData, showHeatmap, showMarkers, theme = 'dark', userLocation, scamTypes: typeRecords = [], onViewReport }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const heatLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const fittedInitialReportsRef = useRef(false);
  const scamTypes = Object.fromEntries(typeRecords.map(type => [type.id, type]));

  // Init map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.center,
      zoom: MAP_CONFIG.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    const tileConfig = TILE_LAYERS[theme] || TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
    }).addTo(map);

    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap tile layer when theme changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileConfig = TILE_LAYERS[theme] || TILE_LAYERS.dark;
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
    }).addTo(map);
  }, [theme]);

  // Update heatmap layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeatmap && heatmapData.length > 0) {
      heatLayerRef.current = L.heatLayer(heatmapData, HEATMAP_CONFIG).addTo(map);
    }
  }, [heatmapData, showHeatmap]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!showMarkers) return;

    points.forEach((point, i) => {
      const icon = createDivIcon(point.type, scamTypes);
      const marker = L.marker([point.lat, point.lng], { icon });

      const popupContent = buildPopupHTML(point, scamTypes);
      marker.bindPopup(popupContent, {
        maxWidth: 280,
        className: 'djaga-popup',
      });
      marker.on('popupopen', () => {
        const button = document.querySelector('.djaga-view-report');
        if (!button) return;
        button.onclick = (event) => {
          event.preventDefault();
          const reportId = Number(button.dataset.reportId);
          if (Number.isInteger(reportId) && reportId > 0) onViewReport?.(reportId);
          map.closePopup();
        };
      });

      setTimeout(() => {
        layer.addLayer(marker);
      }, i * 30);
    });
  }, [points, showMarkers, typeRecords]);

  // The weekly feed spans both Peninsular and East Malaysia. Fit the initial
  // view to the actual persisted report coordinates rather than leaving a
  // phone viewport centred on only one side of the country.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedInitialReportsRef.current || !points.length) return;
    const coordinates = points
      .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map(point => [point.lat, point.lng]);
    if (!coordinates.length) return;
    fittedInitialReportsRef.current = true;
    map.fitBounds(L.latLngBounds(coordinates), { padding: [24, 24], maxZoom: 5, animate: false });
  }, [points]);

  // Location never leaves the browser: it only controls this map view and local marker.
  useEffect(() => {
    const map = mapRef.current; const layer = userLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!userLocation) return;
    const marker = L.circleMarker([userLocation.lat, userLocation.lng], { radius: 9, color: '#ffffff', weight: 3, fillColor: '#4FD1A5', fillOpacity: 1 });
    marker.bindPopup('Your location — only visible on this device.'); layer.addLayer(marker);
    map.setView([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 11), { animate: true });
  }, [userLocation]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#315849',
      }}
    />
  );
}
