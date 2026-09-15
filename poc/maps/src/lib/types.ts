export type ResolveMethod =
  | 'client-parser-expanded'
  | 'cors-proxy-redirect'
  | 'manual'
  | 'resolve-api'
  | 'entitylist-getlist'
  | 'cors-proxy-entitylist'
  | 'fixture-fallback';

export interface ResolvedListPlace {
  name?: string;
  lat: number;
  lng: number;
  placeId?: string;
  address?: string;
}

export interface ResolvedList {
  sourceUrl: string;
  resolvedUrl?: string;
  title?: string;
  places: ResolvedListPlace[];
  resolveMethod: ResolveMethod;
}

export interface ListResolveSuccess {
  ok: true;
  list: ResolvedList;
}

export interface ListResolveFailure {
  ok: false;
  error: string;
  hint?: string;
}

export type ListResolveResult = ListResolveSuccess | ListResolveFailure;

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
