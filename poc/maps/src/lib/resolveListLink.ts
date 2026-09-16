import sapporoFixture from '../data/sapporo-list.json';
import { expandShortLink } from './expandShortLink';
import { fetchViaJina } from './fetchViaJina';
import { getResolveApiBase } from './getResolveApiBase';
import {
  buildEntityListGetListUrl,
  extractListIdFromUrl,
} from './parseGoogleMapsListUrl';
import { isExpandedLink, isShortLink } from './parseGoogleMapsUrl';
import { unwrapGoogleMapsUrl } from './unwrapGoogleMapsUrl';
import type { ListResolveResult, ResolvedList, ResolvedListPlace } from './types';

const REQUEST_TIMEOUT_MS = 15_000;
const EXAMPLE_SHORT_URL = 'https://maps.app.goo.gl/ZKGW1AaMWT2eePtd6';
const EXAMPLE_LIST_ID = 'wkR0T1lyzscvuOSJnXq3qg';

function stripGoogleJsonPrefix(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith(")]}'")) {
    return trimmed.slice(4).trim();
  }
  return trimmed;
}

function parseEntityListResponse(raw: unknown, sourceUrl: string, resolvedUrl?: string): ResolvedList | null {
  if (!Array.isArray(raw) || !Array.isArray(raw[0])) return null;

  const header = raw[0];
  const title = typeof header[4] === 'string' ? header[4] : undefined;
  const placesRaw = header[8];
  if (!Array.isArray(placesRaw)) return null;

  const places: ResolvedListPlace[] = [];
  for (const item of placesRaw) {
    if (!Array.isArray(item)) continue;
    const name = typeof item[2] === 'string' ? item[2] : undefined;
    const coordBlock = Array.isArray(item[1]) ? item[1][5] : null;
    if (!Array.isArray(coordBlock) || coordBlock.length < 4) continue;
    const lat = coordBlock[2];
    const lng = coordBlock[3];
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    places.push({
      name,
      lat,
      lng,
    });
  }

  if (places.length === 0) return null;

  return {
    sourceUrl,
    resolvedUrl,
    title,
    places,
    resolveMethod: 'entitylist-getlist',
  };
}

async function resolveExpandedUrl(sourceUrl: string): Promise<string> {
  if (isShortLink(sourceUrl)) {
    const expanded = await expandShortLink(sourceUrl);
    if (expanded.ok) return expanded.resolvedUrl;
    return sourceUrl;
  }

  if (isExpandedLink(sourceUrl)) {
    return unwrapGoogleMapsUrl(sourceUrl);
  }

  return unwrapGoogleMapsUrl(sourceUrl);
}

async function fetchGetListBody(getListUrl: string): Promise<{ body: string | null; errors: string[] }> {
  const errors: string[] = [];

  const viaJina = await fetchViaJina(getListUrl);
  if (viaJina.ok) {
    return { body: viaJina.body, errors };
  }
  errors.push(viaJina.error);

  const viaAllOrigins = await fetchViaAllOrigins(getListUrl);
  if (viaAllOrigins.body) {
    return { body: viaAllOrigins.body, errors };
  }
  if (viaAllOrigins.error) errors.push(viaAllOrigins.error);

  const viaCorsProxy = await fetchViaCorsProxyIo(getListUrl);
  if (viaCorsProxy.body) {
    return { body: viaCorsProxy.body, errors };
  }
  if (viaCorsProxy.error) errors.push(viaCorsProxy.error);

  return { body: null, errors };
}

async function fetchViaAllOrigins(targetUrl: string): Promise<{ body: string | null; error?: string }> {
  const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) return { body: null, error: `allorigins HTTP ${res.status}` };
    const json = (await res.json()) as { contents?: string };
    return { body: json.contents ?? null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { body: null, error: `allorigins: ${msg}` };
  }
}

async function fetchViaCorsProxyIo(targetUrl: string): Promise<{ body: string | null; error?: string }> {
  const proxy = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
  try {
    const res = await fetch(proxy, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) return { body: null, error: `corsproxy.io HTTP ${res.status}` };
    return { body: await res.text() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return { body: null, error: `corsproxy.io: ${msg}` };
  }
}

function matchesFixture(sourceUrl: string, listId: string | null): boolean {
  const normalized = sourceUrl.trim().toLowerCase();
  if (normalized === EXAMPLE_SHORT_URL.toLowerCase()) return true;
  if (normalized.includes('zkgw1aamwt2eeptd6')) return true;
  if (listId === EXAMPLE_LIST_ID) return true;
  return false;
}

function getFixtureFallback(sourceUrl: string): ResolvedList {
  return {
    sourceUrl,
    title: sapporoFixture.title,
    places: sapporoFixture.places,
    resolveMethod: 'fixture-fallback',
  };
}

async function resolveViaApi(sourceUrl: string): Promise<ResolvedList | null> {
  const base = getResolveApiBase();
  if (!base) return null;

  const res = await fetch(`${base}/api/maps/resolve-list-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: sourceUrl }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as ResolvedList;
  if (!Array.isArray(data.places) || data.places.length === 0) return null;

  return {
    ...data,
    resolveMethod: 'resolve-api',
  };
}

async function resolveViaClient(
  sourceUrl: string,
): Promise<{ list: ResolvedList | null; errors: string[] }> {
  const errors: string[] = [];
  const resolvedUrl = await resolveExpandedUrl(sourceUrl);
  const listId = extractListIdFromUrl(resolvedUrl);
  if (!listId) {
    errors.push('목록 ID(!2s…!3e3) 추출 실패');
    return { list: null, errors };
  }

  const getListUrl = buildEntityListGetListUrl(listId);
  const fetched = await fetchGetListBody(getListUrl);
  errors.push(...fetched.errors);

  if (!fetched.body) {
    return { list: null, errors };
  }

  try {
    const parsed = JSON.parse(stripGoogleJsonPrefix(fetched.body));
    const list = parseEntityListResponse(parsed, sourceUrl, resolvedUrl);
    if (!list) {
      errors.push('getlist 응답 파싱 실패');
      return { list: null, errors };
    }
    return { list: { ...list, resolveMethod: 'cors-proxy-entitylist' }, errors };
  } catch {
    errors.push('getlist JSON 파싱 오류');
    return { list: null, errors };
  }
}

export async function resolveListLink(sourceUrl: string): Promise<ListResolveResult> {
  const trimmed = sourceUrl.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL이 비어 있습니다.' };
  }

  const listIdHint = extractListIdFromUrl(trimmed);

  try {
    const viaApi = await resolveViaApi(trimmed);
    if (viaApi) {
      return { ok: true, list: viaApi };
    }
  } catch {
    // API 실패 시 클라이언트·fixture로 폴백
  }

  let clientErrors: string[] = [];
  try {
    const viaClient = await resolveViaClient(trimmed);
    clientErrors = viaClient.errors;
    if (viaClient.list) {
      return { ok: true, list: viaClient.list };
    }
  } catch {
    // fixture 폴백 시도
  }

  if (matchesFixture(trimmed, listIdHint)) {
    return { ok: true, list: getFixtureFallback(trimmed) };
  }

  const detail = clientErrors.length > 0 ? ` (${clientErrors.join('; ')})` : '';
  const hasBackend = Boolean(getResolveApiBase());

  return {
    ok: false,
    error: '목록 링크를 자동으로 해석하지 못했습니다.',
    hint: hasBackend
      ? `백엔드·공개 프록시 모두 실패했습니다${detail}. 펼쳐진 목록 URL을 붙여넣거나 VITE_RESOLVE_API_BASE 백엔드를 확인하세요. 예제 URL(삿포로)은 fixture로 데모 가능합니다.`
      : `비공개 목록·CORS 프록시 제한·비공식 getlist API 변경으로 실패할 수 있습니다${detail}. VITE_RESOLVE_API_BASE 백엔드 프록시 사용을 권장합니다. 예제 URL(삿포로)은 fixture로 데모 가능합니다.`,
  };
}
