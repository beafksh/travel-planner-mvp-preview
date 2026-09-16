const JINA_TIMEOUT_MS = 20_000;

/**
 * r.jina.ai로 CORS-friendly fetch. Google getlist 등 비공식 API용.
 */
export async function fetchViaJina(targetUrl: string): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  try {
    const res = await fetch(jinaUrl, { signal: AbortSignal.timeout(JINA_TIMEOUT_MS) });
    if (!res.ok) {
      return { ok: false, error: `jina HTTP ${res.status}` };
    }
    const text = await res.text();
    const body = stripJinaWrapper(text);
    if (!body) {
      return { ok: false, error: 'jina: 응답 body 비어 있음' };
    }
    return { ok: true, body };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return { ok: false, error: 'jina: 요청 시간 초과 (rate limit 가능)' };
    }
    return { ok: false, error: `jina: ${msg}` };
  }
}

/** Jina markdown 헤더 제거 후 Google JSON(또는 배열) 추출 */
function stripJinaWrapper(text: string): string {
  const prefixIdx = text.indexOf(")]}'");
  if (prefixIdx >= 0) {
    return text.slice(prefixIdx + 4).trim();
  }

  const arrayIdx = text.indexOf('[[');
  if (arrayIdx >= 0) {
    return text.slice(arrayIdx).trim();
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  return text.trim();
}
