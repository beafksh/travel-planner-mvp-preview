export type RouteMethod = 'osrm' | 'google-directions' | 'straight-line';

export interface RouteResult {
  positions: [number, number][];
  method: RouteMethod;
  error?: string;
}

export function straightLineRoute(
  spots: Array<{ lat: number; lng: number }>,
): RouteResult {
  const positions: [number, number][] = spots.map((s) => [s.lat, s.lng]);
  return { positions, method: 'straight-line' };
}
