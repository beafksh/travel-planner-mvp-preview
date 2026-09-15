export interface ResolvedPlace {
  placeId?: string;
  name: string;
  lat: number;
  lng: number;
  formattedAddress?: string;
}

export interface ResolveApiSuccess {
  ok: true;
  source: 'parser' | 'stub-redirect' | 'stub-mock' | 'client-parser';
  place: ResolvedPlace;
}

export interface ResolveApiFailure {
  ok: false;
  error: string;
  hint?: string;
}

export type ResolveApiResult = ResolveApiSuccess | ResolveApiFailure;

export interface DaySpot {
  order: number;
  name: string;
  lat: number;
  lng: number;
  time?: string;
  label?: string;
}
