/**
 * Google Maps POI(placeId) 클릭 시 장소명 조회. Places 라이브러리 필요.
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
