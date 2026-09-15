import sapporoFixture from '../data/sapporo-list.json';
import {
  buildEntityListGetListUrl,
  extractListIdFromUrl,
} from './parseGoogleMapsListUrl';
import { isShortLink } from './parseGoogleMapsUrl';
import type { ListResolveResult, ResolvedList, ResolvedListPlace } from './types';

const PROXY_TIMEOUT_MS = 15_000;
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

async function fetchViaCorsProxy(targetUrl: string): Promise<string | null> {
  const attempts: Array<() => Promise<string | null>> = [
    async () => {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
      if (!res.ok) return null;
      const json = (await res.json()) as { contents?: string };
      return json.contents ?? null;
    },
    async () => {
      const proxy = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
      if (!res.ok) return null;
      return res.text();
    },
  ];

  for (const attempt of attempts) {
    try {
      const body = await attempt();
      if (body) return body;
    } catch {
      // 다음 프록시 시도
    }
  }

  return null;
}

async function resolveRedirectUrl(sourceUrl: string): Promise<string | null> {
  if (!isShortLink(sourceUrl)) return sourceUrl;

  const attempts: Array<() => Promise<string | null>> = [
    async () => {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(sourceUrl)}`;
      const res = await fetch(proxy, { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
      if (!res.ok) return null;
      const json = (await res.json()) as { status?: { url?: string } };
      return json.status?.url ?? null;
    },
    async () => {
      const proxy = `https://corsproxy.io/?${encodeURIComponent(sourceUrl)}`;
      const res = await fetch(proxy, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (res.url && res.url !== proxy) return res.url;
      return null;
    },
  ];

  for (const attempt of attempts) {
    try {
      const resolved = await attempt();
      if (resolved) return resolved;
    } catch {
      // 다음 프록시 시도
    }
  }

  return null;
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
  const base = import.meta.env.VITE_RESOLVE_API_BASE?.replace(/\/$/, '');
  if (!base) return null;

  const res = await fetch(`${base}/api/maps/resolve-list-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: sourceUrl }),
    signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as ResolvedList;
  if (!Array.isArray(data.places) || data.places.length === 0) return null;

  return {
    ...data,
    resolveMethod: 'resolve-api',
  };
}

async function resolveViaClient(sourceUrl: string): Promise<ResolvedList | null> {
  const resolvedUrl = await resolveRedirectUrl(sourceUrl);
  const listId = extractListIdFromUrl(resolvedUrl ?? sourceUrl);
  if (!listId) return null;

  const getListUrl = buildEntityListGetListUrl(listId);
  const body = await fetchViaCorsProxy(getListUrl);
  if (!body) return null;

  try {
    const parsed = JSON.parse(stripGoogleJsonPrefix(body));
    const list = parseEntityListResponse(parsed, sourceUrl, resolvedUrl ?? undefined);
    if (!list) return null;
    return { ...list, resolveMethod: 'cors-proxy-entitylist' };
  } catch {
    return null;
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

  try {
    const viaClient = await resolveViaClient(trimmed);
    if (viaClient) {
      return { ok: true, list: viaClient };
    }
  } catch {
    // fixture 폴백 시도
  }

  if (matchesFixture(trimmed, listIdHint)) {
    return { ok: true, list: getFixtureFallback(trimmed) };
  }

  return {
    ok: false,
    error: '목록 링크를 자동으로 해석하지 못했습니다.',
    hint:
      '비공개 목록·CORS 프록시 제한·비공식 getlist API 변경으로 실패할 수 있습니다. 예제 URL(삿포로)은 fixture로 데모 가능합니다. VITE_RESOLVE_API_BASE 백엔드 프록시 사용을 권장합니다.',
  };
}
