/**
 * 브라우저용 Google Maps URL 파서 (펼쳐진 URL만 지원).
 * short link는 CORS로 브라우저에서 follow 불가 → /api/maps/resolve-link 스텁 사용.
 */

import type { ResolvedPlace } from './types';

export function parseExpandedGoogleMapsUrl(url: string): ResolvedPlace | null {
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
    name: name ?? '알 수 없는 장소',
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

  return null;
}

function extractPlaceName(url: string): string | undefined {
  const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
  if (placeMatch?.[1]) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
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
