import { useCallback, useState } from 'react';
import { DayRouteMap } from './components/DayRouteMap';
import { LinkResolver } from './components/LinkResolver';
import { ListLinkImporter } from './components/ListLinkImporter';
import { TOKYO_DAY2_SPOTS } from './data/sampleSpots';
import type { CandidateSpot, DaySpot } from './lib/types';

let nextSpotId = 100;

export default function App() {
  const [spots, setSpots] = useState<DaySpot[]>(TOKYO_DAY2_SPOTS);
  const [candidates, setCandidates] = useState<CandidateSpot[]>([]);

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

  const handleAddCandidate = useCallback((partial: Omit<CandidateSpot, 'id'>) => {
    setCandidates((prev) => [
      ...prev,
      {
        ...partial,
        id: `candidate-${nextSpotId++}`,
      },
    ]);
  }, []);

  const handleMoveCandidateToDay = useCallback((candidateId: string) => {
    setCandidates((prevCandidates) => {
      const candidate = prevCandidates.find((c) => c.id === candidateId);
      if (!candidate) return prevCandidates;

      setSpots((prevSpots) => {
        const order = prevSpots.length + 1;
        return [
          ...prevSpots,
          {
            id: `added-${nextSpotId++}`,
            order,
            name: candidate.name,
            lat: candidate.lat,
            lng: candidate.lng,
            label: '후보→동선',
            resolveMethod: 'map-click',
          },
        ];
      });

      return prevCandidates.filter((c) => c.id !== candidateId);
    });
  }, []);

  const handleRemoveCandidate = useCallback((candidateId: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Travel Planner — Maps POC</h1>
        <p className="muted">
          OSM (Leaflet) / Google Maps JavaScript API 토글 · <code>poc/maps/</code> 전용 (wireframes/, s04/ 미변경)
        </p>
      </header>
      <main className="app-main">
        <LinkResolver onAddSpot={handleAddSpot} />
        <ListLinkImporter onAddSpots={handleAddSpots} />
        <DayRouteMap
          spots={spots}
          candidates={candidates}
          onAddSpot={handleAddSpot}
          onAddCandidate={handleAddCandidate}
          onMoveCandidateToDay={handleMoveCandidateToDay}
          onRemoveCandidate={handleRemoveCandidate}
        />
      </main>
      <footer className="app-footer muted">
        POC — GitHub Pages 배포 · Google Maps는 선택(브라우저 키) · OSM 기본
      </footer>
    </div>
  );
}
