import { useState } from 'react';
import { createManualPlace, resolveMapsLink } from '../lib/resolveLink';
import type { DaySpot, ResolvedPlace, ResolveResult } from '../lib/types';

const SAMPLE_EXPANDED =
  'https://www.google.com/maps/place/%E6%B5%85%E8%8D%89%E5%AF%BA/@35.7147651,139.7966553,17z';

interface LinkResolverProps {
  onAddSpot: (spot: Omit<DaySpot, 'id' | 'order'>) => void;
}

export function LinkResolver({ onAddSpot }: LinkResolverProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  async function handleResolve() {
    setLoading(true);
    setResult(null);

    try {
      const data = await resolveMapsLink(url);
      setResult(data);
      if (!data.ok) {
        setShowManual(true);
      }
    } catch (err) {
      setResult({
        ok: false,
        error: '요청 중 오류가 발생했습니다.',
        hint: err instanceof Error ? err.message : undefined,
      });
      setShowManual(true);
    } finally {
      setLoading(false);
    }
  }

  function addPlaceToSpots(place: ResolvedPlace) {
    onAddSpot({
      name: place.name ?? '알 수 없는 장소',
      lat: place.lat,
      lng: place.lng,
      label: place.resolveMethod === 'manual' ? '수동' : '링크',
      sourceUrl: place.sourceUrl,
      resolveMethod: place.resolveMethod,
    });
  }

  function handleManualAdd() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setResult({
        ok: false,
        error: '유효한 위도·경도를 입력하세요.',
        hint: '예: lat 35.7148, lng 139.7967',
      });
      return;
    }

    const place = createManualPlace(url.trim() || '(수동 입력)', lat, lng, manualName);
    setResult({ ok: true, place });
    addPlaceToSpots(place);
    setManualLat('');
    setManualLng('');
    setManualName('');
  }

  return (
    <section className="panel" aria-labelledby="resolver-heading">
      <h2 id="resolver-heading">A) Google Maps 공유 링크 → 위치</h2>
      <p className="muted">
        펼쳐진 <code>google.com/maps/place/…/@lat,lng</code> URL은 브라우저에서 즉시 파싱합니다.
        short link(<code>maps.app.goo.gl</code>)는 CORS 프록시로 시도하며, 실패 시 수동 좌표 입력 폼을
        사용합니다. <strong>Google Maps API 키·빌링 불필요.</strong>
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
        <button type="button" className="link-btn" onClick={() => setShowManual(true)}>
          수동 좌표 입력
        </button>
      </div>

      {result && (
        <div className={`result-box ${result.ok ? 'success' : 'error'}`} role="alert">
          {result.ok ? (
            <>
              <p className="result-source">
                resolveMethod: <strong>{result.place.resolveMethod}</strong>
              </p>
              <dl className="result-fields">
                <div><dt>name</dt><dd>{result.place.name ?? '(없음)'}</dd></div>
                <div><dt>lat</dt><dd>{result.place.lat}</dd></div>
                <div><dt>lng</dt><dd>{result.place.lng}</dd></div>
                <div><dt>placeId</dt><dd>{result.place.placeId ?? '(없음)'}</dd></div>
                <div><dt>formattedAddress</dt><dd>{result.place.formattedAddress ?? '(없음)'}</dd></div>
                <div><dt>sourceUrl</dt><dd>{result.place.sourceUrl}</dd></div>
                <div><dt>resolvedUrl</dt><dd>{result.place.resolvedUrl ?? '(없음)'}</dd></div>
              </dl>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => addPlaceToSpots(result.place)}
              >
                스팟 목록에 추가
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

      {(showManual || (result && !result.ok)) && (
        <div className="manual-form">
          <h3>수동 좌표 입력 (폴백)</h3>
          <p className="muted">
            short link 해석 실패 시 Google Maps에서 좌표를 확인해 직접 입력하세요.
          </p>
          <div className="manual-fields">
            <input
              type="text"
              placeholder="장소 이름 (선택)"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="url-input"
            />
            <input
              type="number"
              step="any"
              placeholder="위도 (lat)"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              className="coord-input"
            />
            <input
              type="number"
              step="any"
              placeholder="경도 (lng)"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              className="coord-input"
            />
            <button type="button" className="btn-primary" onClick={handleManualAdd}>
              스팟 목록에 추가
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
