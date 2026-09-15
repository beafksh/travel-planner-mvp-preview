import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CandidateSpotList } from './CandidateSpotList';
import { fetchRoute, type RouteMethod } from '../lib/osrmRoute';
import { reverseGeocode } from '../lib/reverseGeocode';
import type { CandidateSpot, DaySpot } from '../lib/types';

interface DayRouteMapProps {
  spots: DaySpot[];
  candidates: CandidateSpot[];
  onAddSpot: (spot: Omit<DaySpot, 'id' | 'order'>) => void;
  onAddCandidate: (spot: Omit<CandidateSpot, 'id'>) => void;
  onMoveCandidateToDay: (candidateId: string) => void;
  onRemoveCandidate: (candidateId: string) => void;
}

interface PendingClick {
  lat: number;
  lng: number;
  name: string;
  loading: boolean;
  geocodeError?: string;
  fromCache?: boolean;
}

function createNumberedIcon(order: number) {
  return L.divIcon({
    className: 'numbered-marker',
    html: `<span>${order}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const tempClickIcon = L.divIcon({
  className: 'temp-click-marker',
  html: '<span>+</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const candidateIcon = L.divIcon({
  className: 'candidate-marker-icon',
  html: '<span>★</span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26],
});

function FitBounds({ spots, candidates }: { spots: DaySpot[]; candidates: CandidateSpot[] }) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [
      ...spots.map((s) => [s.lat, s.lng] as [number, number]),
      ...candidates.map((c) => [c.lat, c.lng] as [number, number]),
    ];
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, spots, candidates]);

  return null;
}

function MapClickHandler({ onMapClick, disabled }: { onMapClick: (lat: number, lng: number) => void; disabled: boolean }) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function DayRouteMap({
  spots,
  candidates,
  onAddSpot,
  onAddCandidate,
  onMoveCandidateToDay,
  onRemoveCandidate,
}: DayRouteMapProps) {
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  const [routeMethod, setRouteMethod] = useState<RouteMethod>('straight-line');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [pendingClick, setPendingClick] = useState<PendingClick | null>(null);
  const geocodeRequestRef = useRef(0);

  const center = useMemo(() => {
    if (spots.length === 0) return { lat: 35.7148, lng: 139.7967 };
    const first = spots[0];
    return { lat: first.lat, lng: first.lng };
  }, [spots]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      const result = await fetchRoute(spots);
      if (cancelled) return;
      setRoutePositions(result.positions);
      setRouteMethod(result.method);
      setRouteError(result.error ?? null);
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [spots]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const requestId = ++geocodeRequestRef.current;

    setPendingClick({
      lat,
      lng,
      name: '',
      loading: true,
    });

    reverseGeocode(lat, lng).then((result) => {
      if (geocodeRequestRef.current !== requestId) return;
      setPendingClick({
        lat,
        lng,
        name: result.name,
        loading: false,
        geocodeError: result.error,
        fromCache: result.fromCache,
      });
    });
  }, []);

  const handleCancelClick = useCallback(() => {
    geocodeRequestRef.current += 1;
    setPendingClick(null);
  }, []);

  const handleAddToDay = useCallback(() => {
    if (!pendingClick || pendingClick.loading) return;
    const name = pendingClick.name.trim() || `클릭 지점 (${pendingClick.lat.toFixed(5)}, ${pendingClick.lng.toFixed(5)})`;
    onAddSpot({
      name,
      lat: pendingClick.lat,
      lng: pendingClick.lng,
      label: '맵 클릭',
      resolveMethod: 'map-click',
    });
    setPendingClick(null);
  }, [onAddSpot, pendingClick]);

  const handleAddToCandidates = useCallback(() => {
    if (!pendingClick || pendingClick.loading) return;
    const name = pendingClick.name.trim() || `클릭 지점 (${pendingClick.lat.toFixed(5)}, ${pendingClick.lng.toFixed(5)})`;
    onAddCandidate({
      name,
      lat: pendingClick.lat,
      lng: pendingClick.lng,
    });
    setPendingClick(null);
  }, [onAddCandidate, pendingClick]);

  return (
    <section className="panel" aria-labelledby="route-heading">
      <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
      <p className="muted">
        Leaflet + OpenStreetMap · 동선: OSRM public (
        <code>router.project-osrm.org</code>)
        {routeMethod === 'osrm' ? ' · 경로 표시됨' : ' · 직선 폴백'}
      </p>
      <p className="muted map-click-hint">
        <strong>등록 경로 4:</strong> 지도를 클릭하면 해당 위치를 스팟으로 등록할 수 있습니다 (Nominatim 역지오코딩).
      </p>

      <div className="leaflet-map-wrap">
        <MapContainer center={center} zoom={14} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds spots={spots} candidates={candidates} />
          <MapClickHandler onMapClick={handleMapClick} disabled={false} />
          {spots.map((spot) => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createNumberedIcon(spot.order)}
            >
              <Popup>
                <strong>{spot.order}. {spot.name}</strong>
                {spot.time && <div>{spot.time}</div>}
                <div className="muted">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</div>
              </Popup>
            </Marker>
          ))}
          {candidates.map((spot) => (
            <Marker key={spot.id} position={[spot.lat, spot.lng]} icon={candidateIcon}>
              <Popup>
                <strong>후보: {spot.name}</strong>
                <div className="muted">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</div>
              </Popup>
            </Marker>
          ))}
          {pendingClick && (
            <Marker position={[pendingClick.lat, pendingClick.lng]} icon={tempClickIcon} />
          )}
          {routePositions.length >= 2 && (
            <Polyline
              positions={routePositions}
              pathOptions={{
                color: routeMethod === 'osrm' ? '#1a73e8' : '#9aa0a6',
                weight: routeMethod === 'osrm' ? 4 : 3,
                dashArray: routeMethod === 'osrm' ? undefined : '8 6',
                opacity: 0.85,
              }}
            />
          )}
        </MapContainer>

        {pendingClick && (
          <div className="click-panel" role="dialog" aria-label="클릭 지점 등록">
            <h3>클릭 지점</h3>
            <dl className="click-panel-fields">
              <div>
                <dt>좌표</dt>
                <dd>{pendingClick.lat.toFixed(5)}, {pendingClick.lng.toFixed(5)}</dd>
              </div>
              <div>
                <dt>이름</dt>
                <dd>
                  {pendingClick.loading ? (
                    <span className="muted">Nominatim 조회 중…</span>
                  ) : (
                    <input
                      type="text"
                      className="name-input"
                      value={pendingClick.name}
                      onChange={(e) =>
                        setPendingClick((prev) => prev ? { ...prev, name: e.target.value } : prev)
                      }
                      placeholder="클릭 지점"
                    />
                  )}
                </dd>
              </div>
            </dl>
            {pendingClick.geocodeError && (
              <p className="muted click-panel-note">
                역지오코딩 실패 — 이름 없이도 등록 가능합니다.
              </p>
            )}
            {!pendingClick.loading && pendingClick.fromCache && (
              <p className="muted click-panel-note">캐시된 지명 사용</p>
            )}
            <div className="click-panel-actions">
              <button
                type="button"
                className="btn-primary btn-compact"
                onClick={handleAddToDay}
                disabled={pendingClick.loading}
              >
                Day 동선에 스팟 추가
              </button>
              <button
                type="button"
                className="btn-secondary btn-compact"
                onClick={handleAddToCandidates}
                disabled={pendingClick.loading}
              >
                후보스팟으로 추가
              </button>
              <button type="button" className="btn-ghost btn-compact" onClick={handleCancelClick}>
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {routeError && routeMethod === 'straight-line' && (
        <div className="result-box error" role="alert">
          <p>OSRM 경로 조회 실패 — 직선 Polyline으로 표시합니다.</p>
          <p className="muted">{routeError}</p>
        </div>
      )}

      <SpotList spots={spots} />

      <h3 className="candidate-heading">후보스팟</h3>
      <CandidateSpotList
        candidates={candidates}
        onAddToDay={onMoveCandidateToDay}
        onRemove={onRemoveCandidate}
      />
    </section>
  );
}

function SpotList({ spots }: { spots: DaySpot[] }) {
  if (spots.length === 0) {
    return (
      <p className="muted spot-empty">
        스팟이 없습니다. A)에서 링크를 resolve하거나 지도를 클릭해 추가하세요.
      </p>
    );
  }

  return (
    <ol className="spot-list">
      {spots.map((spot) => (
        <li key={spot.id}>
          <span className="spot-order">{spot.order}</span>
          <span className="spot-name">{spot.name}</span>
          <span className="spot-meta">
            {spot.time ? `${spot.time} · ` : ''}
            {spot.label ?? ''}
            {spot.resolveMethod ? ` · ${spot.resolveMethod}` : ''}
          </span>
          <span className="spot-coords muted">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</span>
        </li>
      ))}
    </ol>
  );
}
