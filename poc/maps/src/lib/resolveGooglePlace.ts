/**
 * Google Maps POI(placeId) 클릭 시 Places Details 조회.
 * Places API (New) 우선, legacy PlacesService 폴백.
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
  apiPath?: 'new' | 'legacy';
}

export interface NearbyPlaceHit {
  placeId: string;
  name?: string;
  lat?: number;
  lng?: number;
}

const PLACE_DETAIL_FIELDS_NEW = [
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'reviews',
  'photos',
] as const;

const PLACE_DETAIL_FIELDS_LEGACY: (keyof google.maps.places.PlaceResult)[] = [
  'name',
  'formatted_address',
  'rating',
  'user_ratings_total',
  'reviews',
  'photos',
  'geometry',
];

const NEARBY_SEARCH_RADIUS_M = 50;
const MAX_POI_DISTANCE_M = 50;

export const PLACES_API_SETUP_HINT =
  'Google Cloud Console에서 브라우저 키에 Maps JavaScript API, Directions API, Places API (New) 및/또는 Places API를 활성화하고 HTTP referrer 제한(beafksh.github.io, localhost)을 확인하세요.';

function isRequestDeniedError(message: string): boolean {
  return /REQUEST_DENIED/i.test(message);
}

export function formatPlacesError(raw?: string): string {
  if (!raw) {
    return `Places API 조회에 실패했습니다. ${PLACES_API_SETUP_HINT}`;
  }
  if (isRequestDeniedError(raw)) {
    return `Places API 접근이 거부되었습니다 (REQUEST_DENIED). ${PLACES_API_SETUP_HINT}`;
  }
  return `Places 상세 조회 실패: ${raw}`;
}

function isNewPlacesApiAvailable(): boolean {
  return (
    typeof google !== 'undefined' &&
    typeof google.maps?.places?.Place === 'function' &&
    typeof google.maps.places.Place.searchNearby === 'function'
  );
}

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

function mapNewPlaceToDetails(
  place: google.maps.places.Place,
  placeId: string,
  fallbackLat: number,
  fallbackLng: number,
): PlaceDetails {
  const location = place.location;
  const lat = location?.lat() ?? fallbackLat;
  const lng = location?.lng() ?? fallbackLng;

  let photoUrl: string | undefined;
  let photoAttribution: string | undefined;
  const photo = place.photos?.[0];
  if (photo) {
    try {
      photoUrl = photo.getURI({ maxWidth: 400, maxHeight: 240 });
      const attributions = photo.authorAttributions
        ?.map((attr) => attr.displayName)
        .filter(Boolean);
      if (attributions && attributions.length > 0) {
        photoAttribution = attributions.join(', ');
      }
    } catch {
      // photo URL 생성 실패 시 무시
    }
  }

  const reviews: PlaceReview[] = (place.reviews ?? [])
    .slice(0, 2)
    .map((review) => ({
      authorName: review.authorAttribution?.displayName ?? '익명',
      rating: review.rating ?? 0,
      text: review.text ?? review.originalText ?? '',
      relativeTimeDescription: review.relativePublishTimeDescription ?? undefined,
    }));

  const name = place.displayName ?? '';

  return {
    placeId,
    name,
    lat,
    lng,
    address: place.formattedAddress ?? undefined,
    rating: place.rating ?? undefined,
    userRatingsTotal: place.userRatingCount ?? undefined,
    reviews: reviews.length > 0 ? reviews : undefined,
    photoUrl,
    photoAttribution,
    apiPath: 'new',
    error: name ? undefined : '장소 이름을 찾을 수 없습니다.',
  };
}

async function fetchGooglePlaceDetailsNew(
  placeId: string,
  fallbackLat: number,
  fallbackLng: number,
): Promise<PlaceDetails> {
  const place = new google.maps.places.Place({ id: placeId });
  await place.fetchFields({ fields: [...PLACE_DETAIL_FIELDS_NEW] });
  return mapNewPlaceToDetails(place, placeId, fallbackLat, fallbackLng);
}

function fetchGooglePlaceDetailsLegacy(
  placeId: string,
  placesService: google.maps.places.PlacesService,
  fallbackLat: number,
  fallbackLng: number,
): Promise<PlaceDetails> {
  return new Promise((resolve) => {
    placesService.getDetails(
      { placeId, fields: PLACE_DETAIL_FIELDS_LEGACY },
      (result, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !result) {
          resolve({
            placeId,
            name: '',
            lat: fallbackLat,
            lng: fallbackLng,
            apiPath: 'legacy',
            error: formatPlacesError(status),
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
          apiPath: 'legacy',
          error: result.name ? undefined : '장소 이름을 찾을 수 없습니다.',
        });
      },
    );
  });
}

export async function fetchGooglePlaceDetails(
  placeId: string,
  fallbackLat: number,
  fallbackLng: number,
  placesService?: google.maps.places.PlacesService | null,
): Promise<PlaceDetails> {
  if (isNewPlacesApiAvailable()) {
    try {
      return await fetchGooglePlaceDetailsNew(placeId, fallbackLat, fallbackLng);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isRequestDeniedError(message)) {
        return {
          placeId,
          name: '',
          lat: fallbackLat,
          lng: fallbackLng,
          apiPath: 'new',
          error: formatPlacesError(message),
        };
      }
      // New API 실패(Place class 오류 등) 시 legacy 1회 시도
    }
  }

  if (placesService) {
    return fetchGooglePlaceDetailsLegacy(placeId, placesService, fallbackLat, fallbackLng);
  }

  return {
    placeId,
    name: '',
    lat: fallbackLat,
    lng: fallbackLng,
    error: formatPlacesError('Places API를 사용할 수 없습니다'),
  };
}

async function findNearbyPlaceNew(
  lat: number,
  lng: number,
): Promise<NearbyPlaceHit | undefined> {
  const { places } = await google.maps.places.Place.searchNearby({
    fields: ['id', 'displayName', 'location'],
    locationRestriction: {
      center: { lat, lng },
      radius: NEARBY_SEARCH_RADIUS_M,
    },
    maxResultCount: 5,
    rankPreference: google.maps.places.SearchNearbyRankPreference.DISTANCE,
  });

  let best: NearbyPlaceHit | undefined;
  let bestDistance = Infinity;

  for (const place of places) {
    const placeId = place.id;
    const location = place.location;
    if (!placeId || !location) continue;

    const placeLat = location.lat();
    const placeLng = location.lng();
    const dist = distanceMeters(lat, lng, placeLat, placeLng);
    if (dist <= MAX_POI_DISTANCE_M && dist < bestDistance) {
      bestDistance = dist;
      best = {
        placeId,
        name: place.displayName ?? undefined,
        lat: placeLat,
        lng: placeLng,
      };
    }
  }

  return best;
}

function findNearbyPlaceLegacy(
  lat: number,
  lng: number,
  placesService: google.maps.places.PlacesService,
): Promise<NearbyPlaceHit | undefined> {
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

        let best: NearbyPlaceHit | undefined;
        let bestDistance = Infinity;

        for (const place of results) {
          if (!place.place_id || !place.geometry?.location) continue;
          const placeLat = place.geometry.location.lat();
          const placeLng = place.geometry.location.lng();
          const dist = distanceMeters(lat, lng, placeLat, placeLng);
          if (dist <= MAX_POI_DISTANCE_M && dist < bestDistance) {
            bestDistance = dist;
            best = {
              placeId: place.place_id,
              name: place.name ?? undefined,
              lat: placeLat,
              lng: placeLng,
            };
          }
        }

        resolve(best);
      },
    );
  });
}

/**
 * placeId 없는 클릭에서 근처 POI를 찾습니다. 50m 이내 가장 가까운 장소만 반환.
 */
export async function findNearbyPlace(
  lat: number,
  lng: number,
  placesService?: google.maps.places.PlacesService | null,
): Promise<NearbyPlaceHit | undefined> {
  if (isNewPlacesApiAvailable()) {
    try {
      const hit = await findNearbyPlaceNew(lat, lng);
      if (hit) return hit;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isRequestDeniedError(message)) {
        return undefined;
      }
    }
  }

  if (placesService) {
    return findNearbyPlaceLegacy(lat, lng, placesService);
  }

  return undefined;
}

/** @deprecated findNearbyPlace 사용 */
export const findNearbyPlaceId = findNearbyPlace;
