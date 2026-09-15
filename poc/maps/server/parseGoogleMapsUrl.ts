/**
 * 펼쳐진 Google Maps URL에서 좌표·장소명·placeId를 추출합니다.
 * 브라우저/서버 공용 (short link redirect follow는 서버에서만 가능).
 */

export interface ParsedPlace {
  name: string;
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
}

export function parseGoogleMapsUrl(url: string): ParsedPlace | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const placeIdFromParam = extractPlaceId(decoded);
  const coords = extractCoordinates(decoded);
  const name = extractPlaceName(decoded);

  if (!coords && !placeIdFromParam) {
    return null;
  }

  if (coords) {
    return {
      name: name ?? '알 수 없는 장소',
      lat: coords.lat,
      lng: coords.lng,
      placeId: placeIdFromParam,
      formattedAddress: name,
    };
  }

  return null;
}

function extractPlaceId(url: string): string | undefined {
  const patterns = [
    /[?&]q=place_id:(ChIJ[\w-]+)/i,
    /place_id[=:](ChIJ[\w-]+)/i,
    /!1s(ChIJ[\w-]+)/,
    /\/place\/(ChIJ[\w-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function extractCoordinates(url: string): { lat: number; lng: number } | null {
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)(?:&|$)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (llMatch) {
    const lat = parseFloat(llMatch[1]);
    const lng = parseFloat(llMatch[2]);
    if (isValidCoord(lat, lng)) return { lat, lng };
  }

  return null;
}

function extractPlaceName(url: string): string | undefined {
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch?.[1]) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  const qNameMatch = url.match(/[?&]q=([^&@]+)/);
  if (qNameMatch?.[1] && !qNameMatch[1].match(/^-?\d/)) {
    return decodeURIComponent(qNameMatch[1].replace(/\+/g, ' '));
  }

  return undefined;
}

function isValidCoord(lat: number, lng: number): boolean {
  return !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isShortGoogleMapsUrl(url: string): boolean {
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps|maps\.google\.com\/\?)/i.test(url.trim());
}

export function isExpandedGoogleMapsUrl(url: string): boolean {
  return /google\.com\/maps/i.test(url.trim());
}
