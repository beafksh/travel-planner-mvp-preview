import { useState } from 'react';
import { resolveListLink } from '../lib/resolveListLink';
import type { DaySpot, ListResolveResult, ResolvedList } from '../lib/types';

const SAMPLE_LIST_URL = 'https://maps.app.goo.gl/ZKGW1AaMWT2eePtd6';

interface ListLinkImporterProps {
  onAddSpots: (spots: Omit<DaySpot, 'id' | 'order'>[]) => void;
}

export function ListLinkImporter({ onAddSpots }: ListLinkImporterProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ListResolveResult | null>(null);

  async function handleImport() {
    setLoading(true);
    setResult(null);

    try {
      const data = await resolveListLink(url);
      setResult(data);
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

  function addListToMap(list: ResolvedList) {
    onAddSpots(
      list.places.map((place) => ({
        name: place.name ?? '알 수 없는 장소',
        lat: place.lat,
        lng: place.lng,
        label: list.title ?? '목록',
        sourceUrl: list.sourceUrl,
        resolveMethod: list.resolveMethod,
      })),
    );
  }

  return (
    <section className="panel" aria-labelledby="list-import-heading">
      <h2 id="list-import-heading">목록 링크 import</h2>
      <p className="muted">
        Google Maps <strong>공유 목록</strong>(Saved list) short link에서 장소를 일괄 추출합니다.
        비공식 <code>entitylist/getlist</code> 엔드포인트 사용 · Google 유료 API 없음.
      </p>

      <div className="resolver-form">
        <label htmlFor="list-url" className="sr-only">Google Maps 목록 URL</label>
        <input
          id="list-url"
          type="url"
          placeholder="https://maps.app.goo.gl/... (공유 목록 링크)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="url-input"
        />
        <button type="button" onClick={handleImport} disabled={loading} className="btn-primary">
          {loading ? 'Importing…' : 'Import'}
        </button>
      </div>

      <div className="sample-links">
        <span>샘플:</span>
        <button type="button" className="link-btn" onClick={() => setUrl(SAMPLE_LIST_URL)}>
          삿포로 목록 (65곳)
        </button>
      </div>

      {result && (
        <div className={`result-box ${result.ok ? 'success' : 'error'}`} role="alert">
          {result.ok ? (
            <>
              <p className="result-source">
                <strong>{result.list.title ?? '(제목 없음)'}</strong>
                {' · '}
                {result.list.places.length}곳
                {' · '}
                resolveMethod: <strong>{result.list.resolveMethod}</strong>
              </p>
              <dl className="result-fields list-result-fields">
                <div><dt>sourceUrl</dt><dd>{result.list.sourceUrl}</dd></div>
                {result.list.resolvedUrl && (
                  <div><dt>resolvedUrl</dt><dd>{result.list.resolvedUrl}</dd></div>
                )}
              </dl>
              <details className="list-preview">
                <summary>장소 미리보기 (처음 10곳)</summary>
                <ol className="list-preview-items">
                  {result.list.places.slice(0, 10).map((place, i) => (
                    <li key={`${place.lat}-${place.lng}-${i}`}>
                      {place.name ?? '(이름 없음)'}
                      <span className="muted">
                        {' '}({place.lat.toFixed(5)}, {place.lng.toFixed(5)})
                      </span>
                    </li>
                  ))}
                  {result.list.places.length > 10 && (
                    <li className="muted">… 외 {result.list.places.length - 10}곳</li>
                  )}
                </ol>
              </details>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => addListToMap(result.list)}
              >
                지도에 추가 ({result.list.places.length}곳 merge)
              </button>
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
