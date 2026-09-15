/**
 * Reverse geocoding for map-click spot registration.
 *
 * Priority:
 * 1. GET {VITE_RESOLVE_API_BASE}/api/maps/reverse-geocode?lat=&lng= (backend Nominatim proxy)
 * 2. Direct Nominatim (free, no API key) — ~1 req/sec, in-memory cache
 * 3. Fallback to coordinate-only name on any failure
 *
 * Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const MIN_INTERVAL_MS = 1100;
const REQUEST_TIMEOUT_MS = 10_000;

interface ReverseGeocodeApiResponse {
  lat: number;
  lng: number;
  displayName?: string;
  address?: string | Record<string, string | undefined>;
}

interface NominatimResponse {
  name?: string;
  display_name?: string;
  address?: Record<string, string | undefined>;
}

interface CacheEntry {
  name: string;
  displayName?: string;
}

const cache = new Map<string, CacheEntry>();
let lastNominatimRequestAt = 0;
let nominatimQueueTail: Promise<void> = Promise.resolve();

function resolveApiBase(): string | undefined {
  return import.meta.env.VITE_RESOLVE_API_BASE?.replace(/\/$/, '');
}

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function fallbackName(lat: number, lng: number): string {
  return `클릭 지점 (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
}

function firstSegment(text: string): string {
  const first = text.split(',')[0]?.trim();
  return first || text.trim();
}

function extractNameFromDisplayName(displayName: string, lat: number, lng: number): string {
  const trimmed = displayName.trim();
  if (!trimmed) return fallbackName(lat, lng);
  return firstSegment(trimmed);
}

function extractNameFromAddressField(
  address: string | Record<string, string | undefined> | undefined,
): string | null {
  if (!address) return null;

  if (typeof address === 'string') {
    const trimmed = address.trim();
    return trimmed ? firstSegment(trimmed) : null;
  }

  const parts = [
    address.tourism,
    address.amenity,
    address.building,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.city,
    address.town,
  ].filter(Boolean);

  return parts.length > 0 ? String(parts[0]) : null;
}

function extractNameFromApi(data: ReverseGeocodeApiResponse, lat: number, lng: number): string {
  if (data.displayName?.trim()) {
    return extractNameFromDisplayName(data.displayName, lat, lng);
  }

  const fromAddress = extractNameFromAddressField(data.address);
  if (fromAddress) return fromAddress;

  return fallbackName(lat, lng);
}

function extractNameFromNominatim(data: NominatimResponse, lat: number, lng: number): string {
  if (data.name?.trim()) return data.name.trim();

  const fromAddress = extractNameFromAddressField(data.address);
  if (fromAddress) return fromAddress;

  if (data.display_name?.trim()) {
    return extractNameFromDisplayName(data.display_name, lat, lng);
  }

  return fallbackName(lat, lng);
}

function scheduleNominatimRequest<T>(fn: () => Promise<T>): Promise<T> {
  const run = nominatimQueueTail.then(async () => {
    const now = Date.now();
    const wait = MIN_INTERVAL_MS - (now - lastNominatimRequestAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastNominatimRequestAt = Date.now();
    return fn();
  });

  nominatimQueueTail = run.then(
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

async function reverseGeocodeViaApi(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const base = resolveApiBase();
  if (!base) return null;

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });

    const response = await fetch(`${base}/api/maps/reverse-geocode?${params}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as ReverseGeocodeApiResponse;
    const name = extractNameFromApi(data, lat, lng);
    const displayName =
      data.displayName?.trim() ||
      (typeof data.address === 'string' ? data.address.trim() : undefined);

    return { name, displayName, fromCache: false };
  } catch {
    return null;
  }
}

async function reverseGeocodeViaNominatim(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const data = await scheduleNominatimRequest(async () => {
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Nominatim HTTP ${response.status}`);
    }

    return (await response.json()) as NominatimResponse;
  });

  const name = extractNameFromNominatim(data, lat, lng);
  return { name, displayName: data.display_name, fromCache: false };
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  const key = cacheKey(lat, lng);
  const cached = cache.get(key);
  if (cached) {
    return { name: cached.name, displayName: cached.displayName, fromCache: true };
  }

  const apiResult = await reverseGeocodeViaApi(lat, lng);
  if (apiResult) {
    cache.set(key, { name: apiResult.name, displayName: apiResult.displayName });
    return apiResult;
  }

  try {
    const nominatimResult = await reverseGeocodeViaNominatim(lat, lng);
    cache.set(key, { name: nominatimResult.name, displayName: nominatimResult.displayName });
    return nominatimResult;
  } catch (err) {
    const name = fallbackName(lat, lng);
    return {
      name,
      fromCache: false,
      error: err instanceof Error ? err.message : 'reverse geocode failed',
    };
  }
}
