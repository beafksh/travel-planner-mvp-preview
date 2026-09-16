export interface PendingClickState {
  lat: number;
  lng: number;
  name: string;
  loading: boolean;
  geocodeError?: string;
  fromCache?: boolean;
  fromPoi?: boolean;
}

interface MapClickPanelProps {
  pendingClick: PendingClickState;
  geocodeLabel: string;
  onNameChange: (name: string) => void;
  onAddToDay: () => void;
  onAddToCandidates: () => void;
  onCancel: () => void;
}

export function MapClickPanel({
  pendingClick,
  geocodeLabel,
  onNameChange,
  onAddToDay,
  onAddToCandidates,
  onCancel,
}: MapClickPanelProps) {
  return (
    <div className="click-panel" role="dialog" aria-label="클릭 지점 등록">
      <h3>{pendingClick.fromPoi ? 'POI 클릭' : '클릭 지점'}</h3>
      <dl className="click-panel-fields">
        <div>
          <dt>좌표</dt>
          <dd>{pendingClick.lat.toFixed(5)}, {pendingClick.lng.toFixed(5)}</dd>
        </div>
        <div>
          <dt>이름</dt>
          <dd>
            {pendingClick.loading ? (
              <span className="muted">{geocodeLabel}</span>
            ) : (
              <input
                type="text"
                className="name-input"
                value={pendingClick.name}
                onChange={(e) => onNameChange(e.target.value)}
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
      {!pendingClick.loading && pendingClick.fromPoi && (
        <p className="muted click-panel-note">Google POI에서 선택됨</p>
      )}
      <div className="click-panel-actions">
        <button
          type="button"
          className="btn-primary btn-compact"
          onClick={onAddToDay}
          disabled={pendingClick.loading}
        >
          Day 동선에 스팟 추가
        </button>
        <button
          type="button"
          className="btn-secondary btn-compact"
          onClick={onAddToCandidates}
          disabled={pendingClick.loading}
        >
          후보스팟으로 추가
        </button>
        <button type="button" className="btn-ghost btn-compact" onClick={onCancel}>
          취소
        </button>
      </div>
    </div>
  );
}
