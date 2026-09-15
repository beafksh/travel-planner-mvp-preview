import {
  isExpandedGoogleMapsUrl,
  isShortGoogleMapsUrl,
  parseGoogleMapsUrl,
  type ParsedPlace,
} from './parseGoogleMapsUrl';

export interface ResolveSuccess {
  ok: true;
  source: 'parser' | 'stub-redirect' | 'stub-mock';
  place: ParsedPlace & { placeId?: string };
}

export interface ResolveFailure {
  ok: false;
  error: string;
  hint?: string;
}

export type ResolveResult = ResolveSuccess | ResolveFailure;

/** 데모용 short link → 펼쳐진 URL 매핑 (CORS/키 없이 재현) */
const MOCK_SHORT_LINKS: Record<string, string> = {
  'https://maps.app.goo.gl/sensoji-demo': 'https://www.google.com/maps/place/%E6%B5%85%E8%8D%89%E5%AF%BA/@35.7147651,139.7966553,17z/data=!3m1!4b1!4m6!3m5!1s0x60188ec16f281e55:0x8b2c8b5c3b3b3b3b!8m2!3d35.7147651!4d139.7966553',
  'https://maps.app.goo.gl/ueno-demo': 'https://www.google.com/maps/place/Ueno+Park/@35.714755,139.773431,15z',
};

export async function resolveLinkHandler(url: string): Promise<ResolveResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'URL이 비어 있습니다.' };
  }

  if (!isShortGoogleMapsUrl(trimmed) && !isExpandedGoogleMapsUrl(trimmed)) {
    return {
      ok: false,
      error: 'Google Maps URL이 아닙니다.',
      hint: 'maps.app.goo.gl 또는 google.com/maps 형식을 입력하세요.',
    };
  }

  if (isExpandedGoogleMapsUrl(trimmed)) {
    const parsed = parseGoogleMapsUrl(trimmed);
    if (!parsed) {
      return {
        ok: false,
        error: 'URL에서 좌표를 추출할 수 없습니다.',
        hint: 'place/@lat,lng 형식의 펼쳐진 링크를 사용하세요.',
      };
    }
    return { ok: true, source: 'parser', place: parsed };
  }

  const mockExpanded = MOCK_SHORT_LINKS[trimmed.replace(/\/$/, '')];
  if (mockExpanded) {
    const parsed = parseGoogleMapsUrl(mockExpanded);
    if (parsed) {
      return {
        ok: true,
        source: 'stub-mock',
        place: { ...parsed, placeId: parsed.placeId ?? 'ChIJ-demo-sensoji' },
      };
    }
  }

  try {
    const expanded = await followRedirect(trimmed);
    const parsed = parseGoogleMapsUrl(expanded);
    if (parsed) {
      return { ok: true, source: 'stub-redirect', place: parsed };
    }
    return {
      ok: false,
      error: '리다이렉트 후 URL 파싱에 실패했습니다.',
      hint: `리다이렉트 대상: ${expanded.slice(0, 120)}…`,
    };
  } catch (err) {
    return {
      ok: false,
      error: 'short link 리다이렉트 follow 실패',
      hint:
        err instanceof Error
          ? `${err.message}. 데모용: maps.app.goo.gl/sensoji-demo 또는 펼쳐진 google.com/maps URL을 사용하세요.`
          : '펼쳐진 google.com/maps URL을 직접 붙여넣으세요.',
    };
  }
}

async function followRedirect(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': 'TravelPlanner-MapsPOC/0.1',
    },
  });
  return response.url;
}
