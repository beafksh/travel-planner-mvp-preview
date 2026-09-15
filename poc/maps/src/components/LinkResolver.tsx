import { useState } from 'react';
import {
  isExpandedLink,
  isShortLink,
  parseExpandedGoogleMapsUrl,
} from '../lib/parseGoogleMapsUrl';
import type { ResolveApiResult } from '../lib/types';

const SAMPLE_EXPANDED =
  'https://www.google.com/maps/place/%E6%B5%85%E8%8D%89%E5%AF%BA/@35.7147651,139.7966553,17z';

const SAMPLE_SHORT = 'https://maps.app.goo.gl/sensoji-demo';

export function LinkResolver() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveApiResult | null>(null);

  async function handleResolve() {
    setLoading(true);
    setResult(null);

    try {
      const trimmed = url.trim();
      if (!trimmed) {
        setResult({ ok: false, error: 'URL을 입력하세요.' });
        return;
      }

      if (isExpandedLink(trimmed)) {
        const parsed = parseExpandedGoogleMapsUrl(trimmed);
        if (parsed) {
          setResult({ ok: true, source: 'client-parser', place: parsed });
          return;
        }
        setResult({
          ok: false,
          error: '클라이언트 파서가 좌표를 추출하지 못했습니다.',
          hint: 'place/@lat,lng 형식의 펼쳐진 URL을 사용하세요.',
        });
        return;
      }

      if (isShortLink(trimmed) || trimmed.includes('google.com/maps')) {
        const response = await fetch('/api/maps/resolve-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmed }),
        });
        const data = (await response.json()) as ResolveApiResult;
        setResult(data);
        return;
      }

      setResult({
        ok: false,
        error: '지원하지 않는 URL 형식입니다.',
        hint: 'maps.app.goo.gl 또는 google.com/maps 링크를 입력하세요.',
      });
    } catch (err) {
      setResult({
        ok: false,
        error: '요청 중 오류가 발생했습니다.',
        hint: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="resolver-heading">
      <h2 id="resolver-heading">A) Google Maps 공유 링크 → 위치</h2>
      <p className="muted">
        펼쳐진 <code>google.com/maps/place/…/@lat,lng</code> URL은 브라우저에서 즉시 파싱합니다.
        short link(<code>maps.app.goo.gl</code>)는 CORS 제한으로 서버 스텁{' '}
        <code>POST /api/maps/resolve-link</code>을 사용합니다.
      </p>

      <div className="resolver-form">
        <label htmlFor="maps-url" className="sr-only">Google Maps URL</label>
        <input
          id="maps-url"
          type="url"
          placeholder="https://maps.app.goo.gl/... 또는 https://www.google.com/maps/place/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="url-input"
        />
        <button type="button" onClick={handleResolve} disabled={loading} className="btn-primary">
          {loading ? 'Resolving…' : 'Resolve'}
        </button>
      </div>

      <div className="sample-links">
        <span>샘플:</span>
        <button type="button" className="link-btn" onClick={() => setUrl(SAMPLE_EXPANDED)}>
          펼쳐진 URL (센소지)
        </button>
        <button type="button" className="link-btn" onClick={() => setUrl(SAMPLE_SHORT)}>
          short link 스텁 (sensoji-demo)
        </button>
      </div>

      {result && (
        <div className={`result-box ${result.ok ? 'success' : 'error'}`} role="alert">
          {result.ok ? (
            <>
              <p className="result-source">출처: <strong>{result.source}</strong></p>
              <dl className="result-fields">
                <div><dt>name</dt><dd>{result.place.name}</dd></div>
                <div><dt>lat</dt><dd>{result.place.lat}</dd></div>
                <div><dt>lng</dt><dd>{result.place.lng}</dd></div>
                <div><dt>placeId</dt><dd>{result.place.placeId ?? '(없음 — URL에 미포함)'}</dd></div>
                <div><dt>formattedAddress</dt><dd>{result.place.formattedAddress ?? '(없음)'}</dd></div>
              </dl>
            </>
          ) : (
            <>
              <p><strong>오류:</strong> {result.error}</p>
              {result.hint && <p className="muted">{result.hint}</p>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
