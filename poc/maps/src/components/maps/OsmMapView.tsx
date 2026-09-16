import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { CandidateSpot, DaySpot } from '../../lib/types';
import type { RouteMethod } from '../../lib/routeTypes';

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

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface OsmMapViewProps {
  spots: DaySpot[];
  candidates: CandidateSpot[];
  routePositions: [number, number][];
  routeMethod: RouteMethod;
  pendingClick: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

export function OsmMapView({
  spots,
  candidates,
  routePositions,
  routeMethod,
  pendingClick,
  onMapClick,
}: OsmMapViewProps) {
  const center = useMemo(() => {
    if (spots.length === 0) return { lat: 35.7148, lng: 139.7967 };
    const first = spots[0];
    return { lat: first.lat, lng: first.lng };
  }, [spots]);

  return (
    <MapContainer center={center} zoom={14} scrollWheelZoom className="leaflet-map">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds spots={spots} candidates={candidates} />
      <MapClickHandler onMapClick={onMapClick} />
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
  );
}
