/**
 * Nominatim reverse geocoding (free, no API key).
 * Policy: https://operations.osmfoundation.org/policies/nominatim/
 * - ~1 request/sec
 * - In-memory cache by rounded coordinates
 * - Browser fetch cannot set User-Agent header; the browser default is sent.
 */

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const MIN_INTERVAL_MS = 1100;

interface NominatimAddress {
  tourism?: string;
  amenity?: string;
  building?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: NominatimAddress;
}

interface CacheEntry {
  name: string;
  displayName?: string;
}

const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;
let queueTail: Promise<void> = Promise.resolve();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function fallbackName(lat: number, lng: number): string {
  return `클릭 지점 (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

function extractName(data: NominatimResponse, lat: number, lng: number): string {
  if (data.name?.trim()) return data.name.trim();

  const addr = data.address;
  if (addr) {
    const parts = [
      addr.tourism,
      addr.amenity,
      addr.building,
      addr.road,
      addr.neighbourhood,
      addr.suburb,
    ].filter(Boolean);
    if (parts.length > 0) return parts[0]!;
  }

  if (data.display_name) {
    const first = data.display_name.split(',')[0]?.trim();
    if (first) return first;
  }

  return fallbackName(lat, lng);
}

function scheduleRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = queueTail.then(async () => {
    const now = Date.now();
    const wait = MIN_INTERVAL_MS - (now - lastRequestAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return fn();
  });

  queueTail = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

export interface ReverseGeocodeResult {
  name: string;
  displayName?: string;
  fromCache: boolean;
  error?: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached) {
    return { name: cached.name, displayName: cached.displayName, fromCache: true };
  }

  try {
    const data = await scheduleRequest(async () => {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'json',
        zoom: '18',
        addressdetails: '1',
      });

      const response = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'ko,en',
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
      }

      return (await response.json()) as NominatimResponse;
    });

    const name = extractName(data, lat, lng);
    const entry: CacheEntry = { name, displayName: data.display_name };
    cache.set(key, entry);

    return { name, displayName: data.display_name, fromCache: false };
  } catch (err) {
    const name = fallbackName(lat, lng);
    return {
      name,
      fromCache: false,
      error: err instanceof Error ? err.message : 'reverse geocode failed',
    };
  }
}
