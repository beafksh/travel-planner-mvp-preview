/**
 * consent.google.* / continue= 래핑을 벗겨 실제 Google Maps URL을 반환.
 */
export function unwrapGoogleMapsUrl(url: string): string {
  let current = url.trim();
  if (!current) return current;

  for (let depth = 0; depth < 6; depth++) {
    try {
      current = decodeURIComponent(current);
    } catch {
      // keep current
    }

    const consentInline = current.match(
      /consent\.google\.[^/?#]+\/ml\?[^#]*(?:&|\?)continue=([^&]+)/i,
    );
    if (consentInline?.[1]) {
      current = consentInline[1];
      continue;
    }

    try {
      const parsed = new URL(current);
      const continueParam = parsed.searchParams.get('continue');
      if (continueParam && isGoogleMapsHost(continueParam)) {
        current = continueParam;
        continue;
      }
    } catch {
      // not a valid absolute URL yet
    }

    if (isGoogleMapsHost(current)) {
      return current;
    }

    break;
  }

  return current;
}

export function isGoogleMapsHost(url: string): boolean {
  return /google\.(com|co\.\w+)\/maps/i.test(url);
}
