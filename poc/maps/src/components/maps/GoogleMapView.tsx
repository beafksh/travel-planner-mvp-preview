import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DirectionsRenderer,
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api';
import { getGoogleMapsApiKey, GOOGLE_MAPS_LIBRARIES } from '../../lib/googleMapsConfig';
import { fetchGoogleDirections } from '../../lib/googleDirectionsRoute';
import { findNearbyPlace } from '../../lib/resolveGooglePlace';
import type { RouteResult } from '../../lib/routeTypes';
import type { CandidateSpot, DaySpot } from '../../lib/types';

const mapContainerStyle = { width: '100%', height: '420px' };

function createMarkerIcons() {
  return {
    numbered: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 14,
      fillColor: '#1a73e8',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } satisfies google.maps.Symbol,
    candidate: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 12,
      fillColor: '#f9ab00',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } satisfies google.maps.Symbol,
    pending: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 15,
      fillColor: '#ea4335',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } satisfies google.maps.Symbol,
    poi: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 16,
      fillColor: '#34a853',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
    } satisfies google.maps.Symbol,
  };
}

interface GoogleMapViewProps {
  spots: DaySpot[];
  candidates: CandidateSpot[];
  pendingClick: { lat: number; lng: number } | null;
  poiMarker: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number, placeId?: string, fallbackName?: string) => void;
  onRouteUpdate: (result: RouteResult) => void;
  onLoadError: () => void;
}

export function GoogleMapView({
  spots,
  candidates,
  pendingClick,
  poiMarker,
  onMapClick,
  onRouteUpdate,
  onLoadError,
}: GoogleMapViewProps) {
  const apiKey = getGoogleMapsApiKey()!;
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const clickRequestRef = useRef(0);
  const onMapClickRef = useRef(onMapClick);
  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [fallbackPolyline, setFallbackPolyline] = useState<[number, number][]>([]);

  onMapClickRef.current = onMapClick;

  const center = useMemo(() => {
    if (spots.length === 0) return { lat: 35.7148, lng: 139.7967 };
    const first = spots[0];
    return { lat: first.lat, lng: first.lng };
  }, [spots]);

  useEffect(() => {
    if (loadError) {
      onLoadError();
    }
  }, [loadError, onLoadError]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    let cancelled = false;

    async function loadRoute() {
      const service = directionsServiceRef.current!;
      const { route, directionsResult: directions } = await fetchGoogleDirections(spots, service);
      if (cancelled) return;

      onRouteUpdate(route);
      setDirectionsResult(directions);
      setFallbackPolyline(
        route.method === 'straight-line' ? route.positions : [],
      );
    }

    loadRoute();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, spots, onRouteUpdate]);

  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;
    for (const spot of spots) {
      bounds.extend({ lat: spot.lat, lng: spot.lng });
      hasPoints = true;
    }
    for (const c of candidates) {
      bounds.extend({ lat: c.lat, lng: c.lng });
      hasPoints = true;
    }
    if (hasPoints) {
      map.fitBounds(bounds, 40);
    }
  }, [spots, candidates]);

  useEffect(() => {
    if (isLoaded) {
      fitBounds();
    }
  }, [isLoaded, fitBounds]);

  const resolveClickWithoutPlaceId = useCallback(async (lat: number, lng: number) => {
    const requestId = ++clickRequestRef.current;
    const map = mapRef.current;

    if (!map) {
      onMapClickRef.current(lat, lng);
      return;
    }

    if (!placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(map);
    }

    const nearbyPlace = await findNearbyPlace(lat, lng, placesServiceRef.current);

    if (clickRequestRef.current !== requestId) return;

    if (nearbyPlace) {
      onMapClickRef.current(
        nearbyPlace.lat ?? lat,
        nearbyPlace.lng ?? lng,
        nearbyPlace.placeId,
        nearbyPlace.name,
      );
    } else {
      onMapClickRef.current(lat, lng);
    }
  }, []);

  const attachNativeClickListener = useCallback(
    (map: google.maps.Map) => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
      }

      clickListenerRef.current = map.addListener(
        'click',
        (e: google.maps.MapMouseEvent & google.maps.IconMouseEvent) => {
          if (!e.latLng) return;

          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const placeId = e.placeId;

          if (placeId) {
            if (typeof e.stop === 'function') {
              e.stop();
            }
            clickRequestRef.current += 1;
            onMapClickRef.current(lat, lng, placeId);
            return;
          }

          resolveClickWithoutPlaceId(lat, lng);
        },
      );
    },
    [resolveClickWithoutPlaceId],
  );

  useEffect(() => {
    return () => {
      clickRequestRef.current += 1;
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, []);

  const handleMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      placesServiceRef.current = new google.maps.places.PlacesService(map);
      attachNativeClickListener(map);
      fitBounds();
    },
    [attachNativeClickListener, fitBounds],
  );

  if (loadError) {
    return (
      <div className="google-map-fallback" role="alert">
        <p>Google Maps를 불러오지 못했습니다.</p>
        <p className="muted">API 키·도메인 제한·빌링 설정을 확인하거나 OSM 모드로 전환하세요.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="google-map-loading">
        <p className="muted">Google Maps 로딩 중…</p>
      </div>
    );
  }

  const markerIcons = createMarkerIcons();

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={14}
      onLoad={handleMapLoad}
      options={{
        clickableIcons: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {directionsResult && (
        <DirectionsRenderer
          options={{
            directions: directionsResult,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#1a73e8',
              strokeWeight: 4,
              strokeOpacity: 0.85,
            },
          }}
        />
      )}
      {fallbackPolyline.length >= 2 && (
        <Polyline
          path={fallbackPolyline.map(([lat, lng]) => ({ lat, lng }))}
          options={{
            strokeColor: '#9aa0a6',
            strokeWeight: 3,
            strokeOpacity: 0.85,
            icons: [
              {
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                offset: '0',
                repeat: '16px',
              },
            ],
          }}
        />
      )}
      {spots.map((spot) => (
        <Marker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          icon={markerIcons.numbered}
          label={{
            text: String(spot.order),
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '700',
          }}
          title={`${spot.order}. ${spot.name}`}
        />
      ))}
      {candidates.map((spot) => (
        <Marker
          key={spot.id}
          position={{ lat: spot.lat, lng: spot.lng }}
          icon={markerIcons.candidate}
          label={{
            text: '★',
            color: '#ffffff',
            fontSize: '10px',
          }}
          title={`후보: ${spot.name}`}
        />
      ))}
      {pendingClick && (
        <Marker
          position={{ lat: pendingClick.lat, lng: pendingClick.lng }}
          icon={markerIcons.pending}
          label={{
            text: '+',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '700',
          }}
        />
      )}
      {poiMarker && (
        <Marker
          position={{ lat: poiMarker.lat, lng: poiMarker.lng }}
          icon={markerIcons.poi}
          zIndex={1000}
        />
      )}
    </GoogleMap>
  );
}
