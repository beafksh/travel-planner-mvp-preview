import { isGoogleMapsHost, unwrapGoogleMapsUrl } from './unwrapGoogleMapsUrl';
import { isShortLink } from './parseGoogleMapsUrl';

const EXPAND_TIMEOUT_MS = 12_000;

export interface ExpandShortLinkSuccess {
  ok: true;
  resolvedUrl: string;
  via: string;
}

export interface ExpandShortLinkFailure {
  ok: false;
  errors: string[];
}

export type ExpandShortLinkResult = ExpandShortLinkSuccess | ExpandShortLinkFailure;

/**
 * short link → 펼쳐진 Google Maps URL.
 * 1) unshorten.me  2) legacy CORS proxies (last resort)
 */
export async function expandShortLink(sourceUrl: string): Promise<ExpandShortLinkResult> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return { ok: false, errors: ['URL이 비어 있습니다.'] };
  }

  if (!isShortLink(trimmed)) {
    const unwrapped = unwrapGoogleMapsUrl(trimmed);
    if (isGoogleMapsHost(unwrapped)) {
      return { ok: true, resolvedUrl: unwrapped, via: 'already-expanded' };
    }
    return { ok: false, errors: ['short link 형식이 아닙니다.'] };
  }

  const errors: string[] = [];

  const viaUnshorten = await tryUnshortenMe(trimmed);
  if (viaUnshorten.ok) {
    return viaUnshorten;
  }
  errors.push(viaUnshorten.error);

  const viaAllOrigins = await tryAllOrigins(trimmed);
  if (viaAllOrigins.ok) {
    return viaAllOrigins;
  }
  errors.push(viaAllOrigins.error);

  const viaCorsProxy = await tryCorsProxyIo(trimmed);
  if (viaCorsProxy.ok) {
    return viaCorsProxy;
  }
  errors.push(viaCorsProxy.error);

  return { ok: false, errors };
}

type AttemptResult = ExpandShortLinkSuccess | { ok: false; error: string };

async function tryUnshortenMe(sourceUrl: string): Promise<AttemptResult> {
  const endpoint = `https://unshorten.me/json/${encodeURIComponent(sourceUrl)}`;
  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS) });
    if (!res.ok) {
      return { ok: false, error: `unshorten.me HTTP ${res.status}` };
    }

    const json = (await res.json()) as { success?: boolean; resolved_url?: string };
    if (!json.success || !json.resolved_url) {
      return { ok: false, error: 'unshorten.me: resolved_url 없음' };
    }

    const resolvedUrl = unwrapGoogleMapsUrl(json.resolved_url);
    if (!isGoogleMapsHost(resolvedUrl)) {
      return { ok: false, error: 'unshorten.me: Google Maps URL로 변환 실패' };
    }

    return { ok: true, resolvedUrl, via: 'unshorten.me' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return { ok: false, error: 'unshorten.me: 요청 시간 초과' };
    }
    return { ok: false, error: `unshorten.me: ${msg}` };
  }
}

async function tryAllOrigins(sourceUrl: string): Promise<AttemptResult> {
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(sourceUrl)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS) });
    if (!res.ok) {
      return { ok: false, error: `allorigins HTTP ${res.status}` };
    }

    const json = (await res.json()) as { status?: { url?: string }; contents?: string };
    const candidates = [
      json.status?.url,
      json.contents?.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1],
      json.contents?.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i)?.[1],
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const resolvedUrl = unwrapGoogleMapsUrl(candidate);
      if (isGoogleMapsHost(resolvedUrl)) {
        return { ok: true, resolvedUrl, via: 'allorigins' };
      }
    }

    return { ok: false, error: 'allorigins: redirect URL 없음' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: `allorigins: ${msg}` };
  }
}

async function tryCorsProxyIo(sourceUrl: string): Promise<AttemptResult> {
  const proxy = `https://corsproxy.io/?${encodeURIComponent(sourceUrl)}`;
  try {
    const res = await fetch(proxy, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(EXPAND_TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, error: `corsproxy.io HTTP ${res.status}` };
    }
    if (res.url && res.url !== proxy) {
      const resolvedUrl = unwrapGoogleMapsUrl(res.url);
      if (isGoogleMapsHost(resolvedUrl)) {
        return { ok: true, resolvedUrl, via: 'corsproxy.io' };
      }
    }
    return { ok: false, error: 'corsproxy.io: redirect URL 없음' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { ok: false, error: `corsproxy.io: ${msg}` };
  }
}
