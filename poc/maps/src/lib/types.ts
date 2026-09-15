export type ResolveMethod =
  | 'client-parser-expanded'
  | 'cors-proxy-redirect'
  | 'manual';

export interface ResolvedPlace {
  placeId?: string;
  name?: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
  sourceUrl: string;
  resolvedUrl?: string;
  resolveMethod: ResolveMethod;
}

export interface ResolveSuccess {
  ok: true;
  place: ResolvedPlace;
}

export interface ResolveFailure {
  ok: false;
  error: string;
  hint?: string;
}

export type ResolveResult = ResolveSuccess | ResolveFailure;

export interface DaySpot {
  id: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
  time?: string;
  label?: string;
  sourceUrl?: string;
  resolveMethod?: ResolveMethod;
}
