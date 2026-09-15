import type { CandidateSpot } from '../lib/types';

interface CandidateSpotListProps {
  candidates: CandidateSpot[];
  onAddToDay: (id: string) => void;
  onRemove: (id: string) => void;
}

export function CandidateSpotList({ candidates, onAddToDay, onRemove }: CandidateSpotListProps) {
  if (candidates.length === 0) {
    return (
      <p className="muted spot-empty">
        후보스팟이 없습니다. 지도를 클릭한 뒤 「후보스팟으로 추가」를 사용하세요.
      </p>
    );
  }

  return (
    <ul className="candidate-list">
      {candidates.map((spot) => (
        <li key={spot.id}>
          <span className="candidate-marker" aria-hidden="true">★</span>
          <span className="spot-name">{spot.name}</span>
          <span className="spot-coords muted">{spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}</span>
          <div className="candidate-actions">
            <button type="button" className="btn-secondary btn-compact" onClick={() => onAddToDay(spot.id)}>
              동선에 추가
            </button>
            <button type="button" className="btn-ghost btn-compact" onClick={() => onRemove(spot.id)}>
              삭제
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
