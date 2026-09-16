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

const NEARBY_SEARCH_RADIUS_M = 50;
const MAX_POI_DISTANCE_M = 50;

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * placeId 없는 클릭에서 근처 POI를 찾습니다. 50m 이내 가장 가까운 장소만 반환.
 */
export function findNearbyPlaceId(
  lat: number,
  lng: number,
  placesService: google.maps.places.PlacesService,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    placesService.nearbySearch(
      {
        location: { lat, lng },
        radius: NEARBY_SEARCH_RADIUS_M,
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve(undefined);
          return;
        }

        let bestPlaceId: string | undefined;
        let bestDistance = Infinity;

        for (const place of results) {
          if (!place.place_id || !place.geometry?.location) continue;
          const placeLat = place.geometry.location.lat();
          const placeLng = place.geometry.location.lng();
          const dist = distanceMeters(lat, lng, placeLat, placeLng);
          if (dist <= MAX_POI_DISTANCE_M && dist < bestDistance) {
            bestDistance = dist;
            bestPlaceId = place.place_id;
          }
        }

        resolve(bestPlaceId);
      },
    );
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
