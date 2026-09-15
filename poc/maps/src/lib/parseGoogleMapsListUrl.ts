/**
 * Google Maps 공유 목록 URL에서 listId 추출 (유료 API 없음).
 */

const LIST_ID_PATTERN = /!2s([^!]+)!3e3/;
const LIST_PATH_PATTERN = /\/maps\/placelists\/list\/([^/?#]+)/i;
const LIST_ID_ONLY = /^[A-Za-z0-9_-]{10,}$/;

export function extractListIdFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const inline = decoded.match(LIST_ID_PATTERN);
  if (inline?.[1]) return inline[1];

  const pathMatch = decoded.match(LIST_PATH_PATTERN);
  if (pathMatch?.[1]) return pathMatch[1];

  if (LIST_ID_ONLY.test(trimmed)) return trimmed;

  return null;
}

export function buildEntityListGetListUrl(listId: string): string {
  const pb = `!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`;
  return `https://www.google.com/maps/preview/entitylist/getlist?pb=${encodeURIComponent(pb)}`;
}

export function isListLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/maps\.app\.goo\.gl/i.test(trimmed)) return true;
  if (/placelists\/list/i.test(trimmed)) return true;
  if (LIST_ID_PATTERN.test(trimmed)) return true;
  if (LIST_ID_ONLY.test(trimmed)) return true;
  return false;
}
