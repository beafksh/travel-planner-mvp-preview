import type { DaySpot } from './types';
import type { RouteResult } from './routeTypes';
import { straightLineRoute } from './routeTypes';

const MAX_WAYPOINTS = 23;

export interface GoogleDirectionsFetchResult {
  route: RouteResult;
  directionsResult: google.maps.DirectionsResult | null;
}

/**
 * Google DirectionsService로 Day 동선 조회. 실패 시 직선 Polyline 폴백.
 * Maps JavaScript API가 로드된 후 호출해야 합니다.
 */
export function fetchGoogleDirections(
  spots: DaySpot[],
  directionsService: google.maps.DirectionsService,
): Promise<GoogleDirectionsFetchResult> {
  const fallback = straightLineRoute(spots);

  if (spots.length < 2) {
    return Promise.resolve({ route: fallback, directionsResult: null });
  }

  if (spots.length - 2 > MAX_WAYPOINTS) {
    return Promise.resolve({
      route: {
        ...fallback,
        error: `Google Directions waypoint 상한(${MAX_WAYPOINTS}) 초과 — 직선 Polyline으로 표시합니다.`,
      },
      directionsResult: null,
    });
  }

  const origin = { lat: spots[0].lat, lng: spots[0].lng };
  const destination = { lat: spots[spots.length - 1].lat, lng: spots[spots.length - 1].lng };
  const waypoints = spots.slice(1, -1).map((s) => ({
    location: { lat: s.lat, lng: s.lng },
    stopover: true,
  }));

  return new Promise((resolve) => {
    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result) {
          resolve({
            route: {
              ...fallback,
              error: `Directions 실패 (${status})`,
            },
            directionsResult: null,
          });
          return;
        }

        const path = result.routes[0]?.overview_path;
        if (!path || path.length === 0) {
          resolve({
            route: {
              ...fallback,
              error: 'Directions 응답에 경로가 없습니다.',
            },
            directionsResult: null,
          });
          return;
        }

        const positions: [number, number][] = path.map((p) => [p.lat(), p.lng()]);
        resolve({
          route: { positions, method: 'google-directions' },
          directionsResult: result,
        });
      },
    );
  });
}
