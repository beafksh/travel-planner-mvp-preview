import { useCallback, useEffect, useRef, useState } from 'react';
import { CandidateSpotList } from './CandidateSpotList';
import { MapModeToggle } from './MapModeToggle';
import { GoogleMapView } from './maps/GoogleMapView';
import { MapClickPanel, type PendingClickState } from './maps/MapClickPanel';
import { OsmMapView } from './maps/OsmMapView';
import { PlaceDetailPanel, type SelectedPlaceState } from './maps/PlaceDetailPanel';
import { getGoogleMapsApiKey } from '../lib/googleMapsConfig';
import { loadMapMode, saveMapMode, type MapMode } from '../lib/mapMode';
import { fetchRoute } from '../lib/osrmRoute';
import { fetchGooglePlaceDetails } from '../lib/resolveGooglePlace';
import { reverseGeocode } from '../lib/reverseGeocode';
import type { RouteMethod, RouteResult } from '../lib/routeTypes';
import type { CandidateSpot, DaySpot } from '../lib/types';

interface DayRouteMapProps {
  spots: DaySpot[];
  candidates: CandidateSpot[];
  onAddSpot: (spot: Omit<DaySpot, 'id' | 'order'>) => void;
  onAddCandidate: (spot: Omit<CandidateSpot, 'id'>) => void;
  onMoveCandidateToDay: (candidateId: string) => void;
  onRemoveCandidate: (candidateId: string) => void;
}

export function DayRouteMap({
  spots,
  candidates,
  onAddSpot,
  onAddCandidate,
  onMoveCandidateToDay,
  onRemoveCandidate,
}: DayRouteMapProps) {
  const googleApiKey = getGoogleMapsApiKey();
  const googleAvailable = Boolean(googleApiKey);

  const [mapMode, setMapMode] = useState<MapMode>(() => {
    const saved = loadMapMode();
    if (saved === 'google' && !googleAvailable) return 'osm';
    return saved;
  });
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false);

  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  const [routeMethod, setRouteMethod] = useState<RouteMethod>('straight-line');
  const [routeError, setRouteError] = useState<string | null>(null);
  const [pendingClick, setPendingClick] = useState<PendingClickState | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlaceState | null>(null);
  const geocodeRequestRef = useRef(0);
  const placeDetailRequestRef = useRef(0);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const getPlacesService = useCallback(() => {
    if (!placesServiceRef.current && typeof google !== 'undefined') {
      placesServiceRef.current = new google.maps.places.PlacesService(
        document.createElement('div'),
      );
    }
    return placesServiceRef.current;
  }, []);

  const handleModeChange = useCallback(
    (mode: MapMode) => {
      if (mode === 'google' && !googleAvailable) return;
      setGoogleLoadFailed(false);
      setMapMode(mode);
      saveMapMode(mode);
    },
    [googleAvailable],
  );

  const handleGoogleLoadError = useCallback(() => {
    setGoogleLoadFailed(true);
  }, []);

  const handleGoogleRouteUpdate = useCallback((result: RouteResult) => {
    setRoutePositions(result.positions);
    setRouteMethod(result.method);
    setRouteError(result.error ?? null);
  }, []);

  useEffect(() => {
    if (mapMode !== 'osm') return;

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
  }, [mapMode, spots]);

  const handlePoiClick = useCallback(
    (lat: number, lng: number, placeId: string) => {
      const requestId = ++placeDetailRequestRef.current;
      setPendingClick(null);
      setSelectedPlace({
        placeId,
        lat,
        lng,
        loading: true,
      });

      const service = getPlacesService();
      if (!service) {
        setSelectedPlace({
          placeId,
          lat,
          lng,
          loading: false,
          error: 'Places 서비스를 초기화할 수 없습니다.',
        });
        return;
      }

      fetchGooglePlaceDetails(placeId, service, lat, lng).then((details) => {
        if (placeDetailRequestRef.current !== requestId) return;
        setSelectedPlace({
          placeId,
          lat: details.lat,
          lng: details.lng,
          loading: false,
          details,
          error: details.error,
        });
      });
    },
    [getPlacesService],
  );

  const handleEmptyMapClick = useCallback((lat: number, lng: number) => {
    const requestId = ++geocodeRequestRef.current;
    setSelectedPlace(null);
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

  const handleMapClick = useCallback(
    (lat: number, lng: number, placeId?: string) => {
      if (placeId && mapMode === 'google') {
        handlePoiClick(lat, lng, placeId);
      } else {
        handleEmptyMapClick(lat, lng);
      }
    },
    [mapMode, handlePoiClick, handleEmptyMapClick],
  );

  const handleCancelClick = useCallback(() => {
    geocodeRequestRef.current += 1;
    setPendingClick(null);
  }, []);

  const handleClosePlacePanel = useCallback(() => {
    placeDetailRequestRef.current += 1;
    setSelectedPlace(null);
  }, []);

  const handleAddToDay = useCallback(() => {
    if (!pendingClick || pendingClick.loading) return;
    const name =
      pendingClick.name.trim() ||
      `클릭 지점 (${pendingClick.lat.toFixed(5)}, ${pendingClick.lng.toFixed(5)})`;
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
    const name =
      pendingClick.name.trim() ||
      `클릭 지점 (${pendingClick.lat.toFixed(5)}, ${pendingClick.lng.toFixed(5)})`;
    onAddCandidate({
      name,
      lat: pendingClick.lat,
      lng: pendingClick.lng,
    });
    setPendingClick(null);
  }, [onAddCandidate, pendingClick]);

  const handleAddPlaceToDay = useCallback(() => {
    if (!selectedPlace?.details?.name) return;
    const { details } = selectedPlace;
    onAddSpot({
      name: details.name,
      lat: details.lat,
      lng: details.lng,
      label: 'POI',
      resolveMethod: 'map-click',
    });
    setSelectedPlace(null);
  }, [onAddSpot, selectedPlace]);

  const handleAddPlaceToCandidates = useCallback(() => {
    if (!selectedPlace?.details?.name) return;
    const { details } = selectedPlace;
    onAddCandidate({
      name: details.name,
      lat: details.lat,
      lng: details.lng,
    });
    setSelectedPlace(null);
  }, [onAddCandidate, selectedPlace]);

  const routeDescription =
    mapMode === 'osm'
      ? routeMethod === 'osrm'
        ? 'OSRM 경로 표시됨'
        : '직선 폴백'
      : routeMethod === 'google-directions'
        ? 'Google Directions 경로 표시됨'
        : '직선 폴백';

  const showGoogleUnavailable = mapMode === 'google' && (!googleAvailable || googleLoadFailed);

  const poiMarker = selectedPlace
    ? { lat: selectedPlace.lat, lng: selectedPlace.lng }
    : null;

  return (
    <section className="panel" aria-labelledby="route-heading">
      <div className="map-panel-header">
        <div>
          <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
          <p className="muted">
            {mapMode === 'osm'
              ? (
                <>
                  Leaflet + OpenStreetMap · 동선: OSRM public (
                  <code>router.project-osrm.org</code>)
                </>
              )
              : (
                <>
                  Google Maps JavaScript API · 동선: DirectionsService + DirectionsRenderer
                </>
              )}
            {' · '}
            {routeDescription}
          </p>
        </div>
        <MapModeToggle
          mode={mapMode}
          googleAvailable={googleAvailable}
          onChange={handleModeChange}
        />
      </div>

      <p className="muted map-click-hint">
        <strong>등록 경로 4:</strong>{' '}
        {mapMode === 'google'
          ? 'POI(장소) 클릭 시 상세 패널 · 빈 지도 클릭 시 좌표 등록 패널'
          : '지도를 클릭하면 해당 위치를 스팟으로 등록할 수 있습니다 (Nominatim 역지오코딩)'}
        .
      </p>

      {showGoogleUnavailable && (
        <div className="result-box error google-unavailable-banner" role="alert">
          <p>
            {googleLoadFailed
              ? 'Google Maps 로드에 실패했습니다.'
              : 'Google Maps API 키가 설정되지 않았습니다.'}
          </p>
          <p className="muted">
            GitHub Actions secret <code>VITE_GOOGLE_MAPS_API_KEY</code> 또는 로컬{' '}
            <code>.env</code>에 브라우저 키를 설정하세요. 키 제한·빌링을 확인한 뒤 다시 시도하거나
            OSM 모드로 전환하세요.
          </p>
          <button type="button" className="btn-secondary btn-compact" onClick={() => handleModeChange('osm')}>
            OSM 모드로 전환
          </button>
        </div>
      )}

      <div className={`map-wrap${selectedPlace ? ' map-wrap--with-detail' : ''}`}>
        {mapMode === 'osm' ? (
          <OsmMapView
            spots={spots}
            candidates={candidates}
            routePositions={routePositions}
            routeMethod={routeMethod}
            pendingClick={pendingClick}
            onMapClick={(lat, lng) => handleMapClick(lat, lng)}
          />
        ) : (
          !showGoogleUnavailable && googleApiKey && (
            <GoogleMapView
              spots={spots}
              candidates={candidates}
              pendingClick={pendingClick}
              poiMarker={poiMarker}
              onMapClick={handleMapClick}
              onRouteUpdate={handleGoogleRouteUpdate}
              onLoadError={handleGoogleLoadError}
            />
          )
        )}

        {pendingClick && !showGoogleUnavailable && (
          <MapClickPanel
            pendingClick={pendingClick}
            geocodeLabel="Nominatim 조회 중…"
            onNameChange={(name) =>
              setPendingClick((prev) => (prev ? { ...prev, name } : prev))
            }
            onAddToDay={handleAddToDay}
            onAddToCandidates={handleAddToCandidates}
            onCancel={handleCancelClick}
          />
        )}

        {selectedPlace && !showGoogleUnavailable && (
          <PlaceDetailPanel
            selectedPlace={selectedPlace}
            onAddToDay={handleAddPlaceToDay}
            onAddToCandidates={handleAddPlaceToCandidates}
            onClose={handleClosePlacePanel}
          />
        )}
      </div>

      {routeError && routeMethod === 'straight-line' && (
        <div className="result-box error" role="alert">
          <p>
            {mapMode === 'osm'
              ? 'OSRM 경로 조회 실패 — 직선 Polyline으로 표시합니다.'
              : 'Google Directions 조회 실패 — 직선 Polyline으로 표시합니다.'}
          </p>
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
