import { expandShortLink } from './expandShortLink';
import { getResolveApiBase } from './getResolveApiBase';
import {
  isExpandedLink,
  isShortLink,
  parseExpandedGoogleMapsUrl,
} from './parseGoogleMapsUrl';
import type { ResolvedPlace, ResolveResult } from './types';

const REQUEST_TIMEOUT_MS = 12_000;

interface ResolveLinkApiResponse {
  lat: number;
  lng: number;
  sourceUrl: string;
  resolvedUrl?: string;
  name?: string;
  placeId?: string;
  formattedAddress?: string;
  resolveMethod?: string;
}

async function resolveViaApi(sourceUrl: string): Promise<ResolvedPlace | null> {
  const base = getResolveApiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}/api/maps/resolve-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: sourceUrl }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ResolveLinkApiResponse;
    if (
      typeof data.lat !== 'number' ||
      typeof data.lng !== 'number' ||
      data.lat < -90 ||
      data.lat > 90 ||
      data.lng < -180 ||
      data.lng > 180
    ) {
      return null;
    }

    return {
      placeId: data.placeId,
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      formattedAddress: data.formattedAddress ?? data.name,
      sourceUrl: data.sourceUrl || sourceUrl,
      resolvedUrl: data.resolvedUrl,
      resolveMethod: 'resolve-api',
    };
  } catch {
    return null;
  }
}

function placeFromExpandedUrl(
  sourceUrl: string,
  resolvedUrl: string,
  resolveMethod: ResolvedPlace['resolveMethod'],
): ResolvedPlace | null {
  const parsed = parseExpandedGoogleMapsUrl(resolvedUrl);
  if (!parsed) return null;

  return {
    placeId: parsed.placeId,
    name: parsed.name,
    lat: parsed.lat,
    lng: parsed.lng,
    formattedAddress: parsed.formattedAddress,
    sourceUrl,
    resolvedUrl,
    resolveMethod,
  };
}

async function resolveViaClientExpanders(sourceUrl: string): Promise<{
  place: ResolvedPlace | null;
  errors: string[];
}> {
  const expanded = await expandShortLink(sourceUrl);
  if (!expanded.ok) {
    return { place: null, errors: expanded.errors };
  }

  const place = placeFromExpandedUrl(sourceUrl, expanded.resolvedUrl, 'cors-proxy-redirect');
  if (!place) {
    return {
      place: null,
      errors: [`${expanded.via}: URL 확장됐으나 좌표 추출 실패`],
    };
  }

  return { place, errors: [] };
}

export async function resolveMapsLink(sourceUrl: string): Promise<ResolveResult> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL이 비어 있습니다.' };
  }

  if (isExpandedLink(trimmed)) {
    const place = placeFromExpandedUrl(trimmed, trimmed, 'client-parser-expanded');
    if (!place) {
      return {
        ok: false,
        error: 'URL에서 좌표를 추출할 수 없습니다.',
        hint: 'place/@lat,lng 또는 !3d…!4d… 형식의 펼쳐진 Google Maps URL을 사용하거나, 아래 수동 입력 폼을 이용하세요.',
      };
    }
    return { ok: true, place };
  }

  if (isShortLink(trimmed)) {
    const viaApi = await resolveViaApi(trimmed);
    if (viaApi) {
      return { ok: true, place: viaApi };
    }

    const viaClient = await resolveViaClientExpanders(trimmed);
    if (viaClient.place) {
      return { ok: true, place: viaClient.place };
    }

    const detail =
      viaClient.errors.length > 0
        ? ` (${viaClient.errors.join('; ')})`
        : '';

    const hasBackend = Boolean(getResolveApiBase());
    const hint = hasBackend
      ? `백엔드·공개 프록시 모두 실패했습니다${detail}. Google Maps에서 「링크 복사」로 펼쳐진 google.com/maps URL을 붙여넣거나, 아래 수동 좌표 입력을 사용하세요.`
      : `short link 자동 해석 실패${detail}. VITE_RESOLVE_API_BASE 백엔드 설정을 권장합니다. 펼쳐진 google.com/maps URL 붙여넣기 또는 수동 좌표 입력을 사용하세요.`;

    return {
      ok: false,
      error: 'short link를 자동으로 해석하지 못했습니다.',
      hint,
    };
  }

  return {
    ok: false,
    error: '지원하지 않는 URL 형식입니다.',
    hint: 'maps.app.goo.gl 또는 google.com/maps 링크를 입력하세요.',
  };
}

export function createManualPlace(
  sourceUrl: string,
  lat: number,
  lng: number,
  name?: string,
): ResolvedPlace {
  return {
    name: name?.trim() || '수동 입력 스팟',
    lat,
    lng,
    formattedAddress: name?.trim(),
    sourceUrl,
    resolveMethod: 'manual',
  };
}
