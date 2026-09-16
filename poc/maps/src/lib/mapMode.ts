export type MapMode = 'osm' | 'google';

const STORAGE_KEY = 'travel-planner-map-mode';

export function loadMapMode(): MapMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'osm' || stored === 'google') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'osm';
}

export function saveMapMode(mode: MapMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
