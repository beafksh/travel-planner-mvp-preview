import { useCallback, useState } from 'react';
import { DayRouteMap } from './components/DayRouteMap';
import { LinkResolver } from './components/LinkResolver';
import { ListLinkImporter } from './components/ListLinkImporter';
import { TOKYO_DAY2_SPOTS } from './data/sampleSpots';
import type { DaySpot } from './lib/types';

let nextSpotId = 100;

export default function App() {
  const [spots, setSpots] = useState<DaySpot[]>(TOKYO_DAY2_SPOTS);

  const handleAddSpot = useCallback((partial: Omit<DaySpot, 'id' | 'order'>) => {
    setSpots((prev) => {
      const order = prev.length + 1;
      return [
        ...prev,
        {
          ...partial,
          id: `added-${nextSpotId++}`,
          order,
        },
      ];
    });
  }, []);

  const handleAddSpots = useCallback((partials: Omit<DaySpot, 'id' | 'order'>[]) => {
    if (partials.length === 0) return;
    setSpots((prev) => {
      let order = prev.length;
      const added = partials.map((partial) => ({
        ...partial,
        id: `added-${nextSpotId++}`,
        order: ++order,
      }));
      return [...prev, ...added];
    });
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Travel Planner — Maps POC</h1>
        <p className="muted">
          OpenStreetMap + Leaflet · 무료 경로 · <code>poc/maps/</code> 전용 (wireframes/, s04/ 미변경)
        </p>
      </header>
      <main className="app-main">
        <LinkResolver onAddSpot={handleAddSpot} />
        <ListLinkImporter onAddSpots={handleAddSpots} />
        <DayRouteMap spots={spots} />
      </main>
      <footer className="app-footer muted">
        POC — GitHub Pages 배포 · Google Maps API 미사용
      </footer>
    </div>
  );
}
