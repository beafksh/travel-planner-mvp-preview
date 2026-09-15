import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { TOKYO_DAY2_SPOTS } from '../data/sampleSpots';
import { MapPlaceholder } from './MapPlaceholder';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

const mapContainerStyle = { width: '100%', height: '420px' };

const defaultCenter = {
  lat: TOKYO_DAY2_SPOTS[0].lat,
  lng: TOKYO_DAY2_SPOTS[0].lng,
};

const libraries: ('places' | 'drawing' | 'geometry' | 'visualization')[] = [];

export function DayRouteMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: MAPS_API_KEY,
    libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeReady, setRouteReady] = useState(false);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !MAPS_API_KEY) return;

    const map = mapRef.current;
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#1a73e8',
        strokeWeight: 4,
        strokeOpacity: 0.85,
      },
    });
    directionsRenderer.setMap(map);
    directionsRendererRef.current = directionsRenderer;

    const origin = TOKYO_DAY2_SPOTS[0];
    const destination = TOKYO_DAY2_SPOTS[TOKYO_DAY2_SPOTS.length - 1];
    const waypoints = TOKYO_DAY2_SPOTS.slice(1, -1).map((spot) => ({
      location: { lat: spot.lat, lng: spot.lng },
      stopover: true,
    }));

    directionsService.route(
      {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        waypoints,
        travelMode: google.maps.TravelMode.WALKING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          setRouteReady(true);
          setRouteError(null);
        } else {
          setRouteError(`Directions API 오류: ${status}`);
          setRouteReady(false);
        }
      },
    );

    return () => {
      directionsRenderer.setMap(null);
      directionsRendererRef.current = null;
    };
  }, [isLoaded]);

  if (!MAPS_API_KEY) {
    return (
      <section className="panel" aria-labelledby="route-heading">
        <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
        <p className="muted">Day 2 · 도쿄 아사쿠사·우에노 ({TOKYO_DAY2_SPOTS.length}개 스팟)</p>
        <MapPlaceholder />
        <SpotList />
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="route-heading">
        <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
        <div className="result-box error">
          <p>Maps API 로드 실패: {loadError.message}</p>
        </div>
        <SpotList />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="route-heading">
      <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
      <p className="muted">
        Day 2 · 도쿄 아사쿠사·우에노 — DirectionsService + DirectionsRenderer (도보)
        {routeReady && ' · 경로 표시됨'}
      </p>

      {!isLoaded ? (
        <div className="map-placeholder"><p>지도 로딩 중…</p></div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={14}
          onLoad={onMapLoad}
          options={{ mapTypeControl: false, streetViewControl: false }}
        >
          {TOKYO_DAY2_SPOTS.map((spot) => (
            <Marker
              key={spot.order}
              position={{ lat: spot.lat, lng: spot.lng }}
              label={{
                text: String(spot.order),
                color: '#fff',
                fontWeight: '700',
              }}
              title={spot.name}
            />
          ))}
        </GoogleMap>
      )}

      {routeError && (
        <div className="result-box error" role="alert">
          <p>{routeError}</p>
          <p className="muted">마커는 표시되지만 동선이 그려지지 않을 수 있습니다. Directions API 활성화·빌링을 확인하세요.</p>
        </div>
      )}

      <SpotList />
    </section>
  );
}

function SpotList() {
  return (
    <ol className="spot-list">
      {TOKYO_DAY2_SPOTS.map((spot) => (
        <li key={spot.order}>
          <span className="spot-order">{spot.order}</span>
          <span className="spot-name">{spot.name}</span>
          <span className="spot-meta">{spot.time} · {spot.label}</span>
          <span className="spot-coords muted">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</span>
        </li>
      ))}
    </ol>
  );
}
