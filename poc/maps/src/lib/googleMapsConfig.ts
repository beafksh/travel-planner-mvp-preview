/**
 * Google Maps 브라우저 키 — 오직 VITE_GOOGLE_MAPS_API_KEY 환경변수에서만 읽습니다.
 * 키 값을 로그·하드코딩하지 않습니다.
 */
export function getGoogleMapsApiKey(): string | undefined {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || key.trim() === '') return undefined;
  return key.trim();
}

export const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];
