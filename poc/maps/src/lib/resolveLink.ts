import {
  isExpandedLink,
  isShortLink,
  parseExpandedGoogleMapsUrl,
} from './parseGoogleMapsUrl';
import type { ResolvedPlace, ResolveResult } from './types';

const PROXY_TIMEOUT_MS = 10_000;

/**
 * 공개 CORS 프록시로 short link redirect follow 시도.
 * 실패율이 높을 수 있음 — README에 한계 명시.
 */
async function tryResolveViaCorsProxy(sourceUrl: string): Promise<ResolvedPlace | null> {
  const attempts: Array<() => Promise<string | null>> = [
    async () => {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(sourceUrl)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
      if (!res.ok) return null;
      const json = (await res.json()) as { status?: { url?: string }; contents?: string };
      if (json.status?.url && isExpandedLink(json.status.url)) {
        return json.status.url;
      }
      const canonical = json.contents?.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
      if (canonical?.[1] && isExpandedLink(canonical[1])) {
        return canonical[1];
      }
      const ogUrl = json.contents?.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i);
      if (ogUrl?.[1] && isExpandedLink(ogUrl[1])) {
        return ogUrl[1];
      }
      return null;
    },
    async () => {
      const proxy = `https://corsproxy.io/?${encodeURIComponent(sourceUrl)}`;
      const res = await fetch(proxy, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (res.url && isExpandedLink(res.url) && res.url !== proxy) {
        return res.url;
      }
      return null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const resolvedUrl = await attempt();
      if (!resolvedUrl) continue;
      const parsed = parseExpandedGoogleMapsUrl(resolvedUrl);
      if (!parsed) continue;
      return {
        placeId: parsed.placeId,
        name: parsed.name,
        lat: parsed.lat,
        lng: parsed.lng,
        formattedAddress: parsed.formattedAddress,
        sourceUrl,
        resolvedUrl,
        resolveMethod: 'cors-proxy-redirect',
      };
    } catch {
      // 다음 프록시 시도
    }
  }

  return null;
}

export async function resolveMapsLink(sourceUrl: string): Promise<ResolveResult> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL이 비어 있습니다.' };
  }

  if (isExpandedLink(trimmed)) {
    const parsed = parseExpandedGoogleMapsUrl(trimmed);
    if (!parsed) {
      return {
        ok: false,
        error: 'URL에서 좌표를 추출할 수 없습니다.',
        hint: 'place/@lat,lng 형식의 펼쳐진 Google Maps URL을 사용하거나, 아래 수동 입력 폼을 이용하세요.',
      };
    }
    return {
      ok: true,
      place: {
        placeId: parsed.placeId,
        name: parsed.name,
        lat: parsed.lat,
        lng: parsed.lng,
        formattedAddress: parsed.formattedAddress,
        sourceUrl: trimmed,
        resolvedUrl: trimmed,
        resolveMethod: 'client-parser-expanded',
      },
    };
  }

  if (isShortLink(trimmed)) {
    const viaProxy = await tryResolveViaCorsProxy(trimmed);
    if (viaProxy) {
      return { ok: true, place: viaProxy };
    }
    return {
      ok: false,
      error: 'short link를 자동으로 해석하지 못했습니다.',
      hint:
        'maps.app.goo.gl 링크는 브라우저·CORS 프록시 제한으로 실패율이 높습니다. Google Maps 앱/웹에서 「링크 복사」로 펼쳐진 URL을 붙여넣거나, 아래 수동 좌표 입력을 사용하세요.',
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
