import type { DaySpot } from './types';
import type { RouteResult } from './routeTypes';
import { straightLineRoute } from './routeTypes';

export type { RouteMethod, RouteResult } from './routeTypes';

/**
 * OSRM public demo 서버로 도보 경로 조회. 실패 시 직선 Polyline 폴백.
 */
export async function fetchRoute(spots: DaySpot[]): Promise<RouteResult> {
  const fallback = straightLineRoute(spots);

  if (spots.length < 2) {
    return fallback;
  }

  const straightLine = fallback.positions;

  try {
    const coords = spots.map((s) => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`;

    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      return {
        positions: straightLine,
        method: 'straight-line',
        error: `OSRM HTTP ${res.status}`,
      };
    }

    const data = (await res.json()) as {
      code?: string;
      routes?: Array<{ geometry: { coordinates: [number, number][] } }>;
    };

    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
      return {
        positions: straightLine,
        method: 'straight-line',
        error: data.code ?? 'OSRM 응답 없음',
      };
    }

    const positions = data.routes[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    return { positions, method: 'osrm' };
  } catch (err) {
    return {
      positions: straightLine,
      method: 'straight-line',
      error: err instanceof Error ? err.message : 'OSRM 요청 실패',
    };
  }
}
