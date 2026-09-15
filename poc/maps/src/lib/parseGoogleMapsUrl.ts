/**
 * 펼쳐진 Google Maps URL에서 좌표·장소명·placeId 추출 (유료 API 없음).
 */

export interface ParsedCoords {
  placeId?: string;
  name?: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export function parseExpandedGoogleMapsUrl(url: string): ParsedCoords | null {
  const trimmed = url.trim();
  if (!trimmed || !/google\.com\/maps/i.test(trimmed)) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const placeId = extractPlaceId(decoded);
  const coords = extractCoordinates(decoded);
  const name = extractPlaceName(decoded);

  if (!coords) return null;

  return {
    placeId,
    name: name ?? undefined,
    lat: coords.lat,
    lng: coords.lng,
    formattedAddress: name,
  };
}

function extractPlaceId(url: string): string | undefined {
  const patterns = [
    /[?&]q=place_id:(ChIJ[\w-]+)/i,
    /place_id[=:](ChIJ[\w-]+)/i,
    /!1s(ChIJ[\w-]+)/,
    /\/place\/(ChIJ[\w-]+)/,
    /!3m1!4b1!4m6!3m5!1s(0x[a-f0-9]+:0x[a-f0-9]+)/i,
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

  const dataMatch = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
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

export function isShortLink(url: string): boolean {
  return /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url.trim());
}

export function isExpandedLink(url: string): boolean {
  return /google\.com\/maps/i.test(url.trim());
}
