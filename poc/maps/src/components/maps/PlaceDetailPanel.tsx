import type { PlaceDetails } from '../../lib/resolveGooglePlace';

export interface SelectedPlaceState {
  placeId: string;
  lat: number;
  lng: number;
  loading: boolean;
  fallbackName?: string;
  details?: PlaceDetails;
  error?: string;
}

interface PlaceDetailPanelProps {
  selectedPlace: SelectedPlaceState;
  onAddToDay: () => void;
  onAddToCandidates: () => void;
  onClose: () => void;
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="place-rating-stars" aria-label={`평점 ${rating}`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
      <span className="place-rating-value">{rating.toFixed(1)}</span>
    </span>
  );
}

export function PlaceDetailPanel({
  selectedPlace,
  onAddToDay,
  onAddToCandidates,
  onClose,
}: PlaceDetailPanelProps) {
  const { loading, details, error, fallbackName, lat, lng } = selectedPlace;
  const displayError = error ?? details?.error;
  const displayName =
    details?.name ||
    fallbackName ||
    (!loading ? `장소 (${lat.toFixed(5)}, ${lng.toFixed(5)})` : undefined);
  const canAdd = !loading;

  return (
    <aside className="place-detail-panel" role="dialog" aria-label="장소 상세">
      <div className="place-detail-header">
        <h3>{loading ? '장소 조회 중…' : displayName || '장소 상세'}</h3>
        <button
          type="button"
          className="place-detail-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </div>

      {loading && (
        <p className="muted place-detail-loading">Places API 조회 중…</p>
      )}

      {!loading && displayError && (
        <div className="place-detail-error" role="alert">
          <p>{displayError}</p>
          <p className="muted">
            상세 정보를 불러오지 못했습니다. 좌표·이름(있는 경우)으로 스팟을 추가하거나 패널을 닫고 다시 시도하세요.
          </p>
        </div>
      )}

      {!loading && !details?.name && !details?.address && (
        <p className="muted place-detail-coords place-detail-coords--standalone">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}

      {!loading && details && (
        <div className="place-detail-body">
          {details.photoUrl && (
            <figure className="place-detail-photo">
              <img src={details.photoUrl} alt={details.name} loading="lazy" />
              {details.photoAttribution && (
                <figcaption className="place-photo-attribution muted">
                  {details.photoAttribution}
                </figcaption>
              )}
            </figure>
          )}

          {details.rating != null && (
            <div className="place-detail-rating">
              <StarRating rating={details.rating} />
              {details.userRatingsTotal != null && (
                <span className="muted place-rating-count">
                  ({details.userRatingsTotal.toLocaleString()}개 리뷰)
                </span>
              )}
            </div>
          )}

          {details.address && (
            <p className="place-detail-address">{details.address}</p>
          )}

          <p className="muted place-detail-coords">
            {details.lat.toFixed(5)}, {details.lng.toFixed(5)}
          </p>

          {details.reviews && details.reviews.length > 0 && (
            <div className="place-detail-reviews">
              <h4>리뷰</h4>
              <ul>
                {details.reviews.map((review, i) => (
                  <li key={i}>
                    <div className="review-meta">
                      <strong>{review.authorName}</strong>
                      <span className="review-rating">★ {review.rating}</span>
                      {review.relativeTimeDescription && (
                        <span className="muted review-time">{review.relativeTimeDescription}</span>
                      )}
                    </div>
                    <p className="review-text">{review.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="place-detail-actions">
        <button
          type="button"
          className="btn-primary btn-compact"
          onClick={onAddToDay}
          disabled={!canAdd}
        >
          Day 스팟 추가
        </button>
        <button
          type="button"
          className="btn-secondary btn-compact"
          onClick={onAddToCandidates}
          disabled={!canAdd}
        >
          후보스팟 추가
        </button>
      </div>
    </aside>
  );
}
