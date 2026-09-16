import type { MapMode } from '../lib/mapMode';

interface MapModeToggleProps {
  mode: MapMode;
  googleAvailable: boolean;
  onChange: (mode: MapMode) => void;
}

export function MapModeToggle({ mode, googleAvailable, onChange }: MapModeToggleProps) {
  return (
    <div className="map-mode-toggle" role="group" aria-label="지도 모드">
      <button
        type="button"
        className={`map-mode-btn${mode === 'osm' ? ' active' : ''}`}
        aria-pressed={mode === 'osm'}
        onClick={() => onChange('osm')}
      >
        OSM (Leaflet)
      </button>
      <button
        type="button"
        className={`map-mode-btn${mode === 'google' ? ' active' : ''}`}
        aria-pressed={mode === 'google'}
        onClick={() => onChange('google')}
        disabled={!googleAvailable}
        title={googleAvailable ? 'Google Maps JavaScript API' : 'API 키가 설정되지 않았습니다'}
      >
        Google Maps
      </button>
    </div>
  );
}
