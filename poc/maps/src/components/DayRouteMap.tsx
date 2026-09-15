import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { fetchRoute, type RouteMethod } from '../lib/osrmRoute';
import type { DaySpot } from '../lib/types';

interface DayRouteMapProps {
  spots: DaySpot[];
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

function FitBounds({ spots }: { spots: DaySpot[] }) {
  const map = useMap();

  useEffect(() => {
    if (spots.length === 0) return;
    const bounds = L.latLngBounds(spots.map((s) => [s.lat, s.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, spots]);

  return null;
}

export function DayRouteMap({ spots }: DayRouteMapProps) {
  const [routePositions, setRoutePositions] = useState<[number, number][]>([]);
  const [routeMethod, setRouteMethod] = useState<RouteMethod>('straight-line');
  const [routeError, setRouteError] = useState<string | null>(null);

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

  return (
    <section className="panel" aria-labelledby="route-heading">
      <h2 id="route-heading">B) S04 일자별 스팟 마커 + 동선</h2>
      <p className="muted">
        Leaflet + OpenStreetMap · 동선: OSRM public (
        <code>router.project-osrm.org</code>)
        {routeMethod === 'osrm' ? ' · 경로 표시됨' : ' · 직선 폴백'}
      </p>

      <div className="leaflet-map-wrap">
        <MapContainer center={center} zoom={14} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds spots={spots} />
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
      </div>

      {routeError && routeMethod === 'straight-line' && (
        <div className="result-box error" role="alert">
          <p>OSRM 경로 조회 실패 — 직선 Polyline으로 표시합니다.</p>
          <p className="muted">{routeError}</p>
        </div>
      )}

      <SpotList spots={spots} />
    </section>
  );
}

function SpotList({ spots }: { spots: DaySpot[] }) {
  if (spots.length === 0) {
    return <p className="muted spot-empty">스팟이 없습니다. A)에서 링크를 resolve하거나 수동으로 추가하세요.</p>;
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
