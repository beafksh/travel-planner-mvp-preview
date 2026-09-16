/**
 * Google Maps POI(placeId) 클릭 시 Places Details 조회. Places 라이브러리 필요.
 */

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription?: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  rating?: number;
  userRatingsTotal?: number;
  reviews?: PlaceReview[];
  photoUrl?: string;
  photoAttribution?: string;
  error?: string;
}

const PLACE_DETAIL_FIELDS: (keyof google.maps.places.PlaceResult)[] = [
  'name',
  'formatted_address',
  'rating',
  'user_ratings_total',
  'reviews',
  'photos',
  'geometry',
];

/**
 * @deprecated POI 이름만 필요할 때 — fetchGooglePlaceDetails 사용 권장
 */
export function resolveGooglePlaceName(
  placeId: string,
  placesService: google.maps.places.PlacesService,
): Promise<{ name: string; error?: string }> {
  return new Promise((resolve) => {
    placesService.getDetails({ placeId, fields: ['name'] }, (result, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && result?.name) {
        resolve({ name: result.name });
        return;
      }
      resolve({
        name: '',
        error: status !== google.maps.places.PlacesServiceStatus.OK
          ? `Places 조회 실패 (${status})`
          : '장소 이름을 찾을 수 없습니다.',
      });
    });
  });
}

export function fetchGooglePlaceDetails(
  placeId: string,
  placesService: google.maps.places.PlacesService,
  fallbackLat: number,
  fallbackLng: number,
): Promise<PlaceDetails> {
  return new Promise((resolve) => {
    placesService.getDetails(
      { placeId, fields: PLACE_DETAIL_FIELDS },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          resolve({
            placeId,
            name: '',
            lat: fallbackLat,
            lng: fallbackLng,
            error: `Places 상세 조회 실패 (${status})`,
          });
          return;
        }

        const location = result.geometry?.location;
        const lat = location?.lat() ?? fallbackLat;
        const lng = location?.lng() ?? fallbackLng;

        let photoUrl: string | undefined;
        let photoAttribution: string | undefined;
        const photo = result.photos?.[0];
        if (photo) {
          try {
            photoUrl = photo.getUrl({ maxWidth: 400, maxHeight: 240 });
            const attributions = photo.html_attributions;
            if (attributions && attributions.length > 0) {
              photoAttribution = attributions.join(' ');
            }
          } catch {
            // photo URL 생성 실패 시 무시
          }
        }

        const reviews: PlaceReview[] = (result.reviews ?? [])
          .slice(0, 2)
          .map((r) => ({
            authorName: r.author_name ?? '익명',
            rating: r.rating ?? 0,
            text: r.text ?? '',
            relativeTimeDescription: r.relative_time_description,
          }));

        resolve({
          placeId,
          name: result.name ?? '',
          lat,
          lng,
          address: result.formatted_address,
          rating: result.rating,
          userRatingsTotal: result.user_ratings_total,
          reviews: reviews.length > 0 ? reviews : undefined,
          photoUrl,
          photoAttribution,
          error: result.name ? undefined : '장소 이름을 찾을 수 없습니다.',
        });
      },
    );
  });
}
