# Travel Planner — Maps POC (`poc/maps/`)

OpenStreetMap(Leaflet)과 **Google Maps JavaScript API**를 토글로 전환하는 지도 스파이크입니다.  
`wireframes/`, `s04/`, 루트 `index.html` 등 기존 기획·퍼블 산출물은 **수정하지 않습니다**.

## 공개 URL (GitHub Pages)

**main 브랜치 머지 후** 아래 주소에서 접속합니다:

https://beafksh.github.io/travel-planner-mvp-preview/maps-poc/

> PR 브랜치에서는 위 URL이 아직 갱신되지 않을 수 있습니다. 로컬 또는 PR 머지 후 확인하세요.

## 지도 모드

| 모드 | 설명 | API 키 |
|------|------|--------|
| **OSM (Leaflet)** | 기본 · OpenStreetMap 타일 + OSRM public 동선 | 불필요 |
| **Google Maps** | Maps JavaScript API + DirectionsService 동선 | `VITE_GOOGLE_MAPS_API_KEY` 필요 |

지도 상단 **OSM / Google Maps** 토글로 전환합니다. 모드·스팟·후보스팟·동선 상태는 전환 후에도 유지됩니다.

키가 없거나 Google Maps 로드에 실패하면 안내 배너가 표시되며 **OSM 모드로 전환**할 수 있습니다. 크래시 없이 OSM만으로도 전체 기능이 동작합니다.

## 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다 (`.env`는 커밋하지 않음):

```bash
cp .env.example .env
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_GOOGLE_MAPS_API_KEY` | Google 모드만 | 브라우저용 Google Maps API 키 |
| `VITE_RESOLVE_API_BASE` | 선택 | 백엔드 resolve 프록시 base URL |

> **보안:** 브라우저 키는 오직 `VITE_GOOGLE_MAPS_API_KEY`에서만 읽습니다. 서버 키(`GOOGLE_MAPS_SERVER_API_KEY`)는 FE·빌드·Actions에 넣지 않습니다.

### Google Cloud 설정 (Google 모드 사용 시)

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성 및 **빌링 활성화**
2. API 활성화:
   - **Maps JavaScript API**
   - **Directions API** (Legacy)
   - **Places API** (POI 클릭 상세 패널 — **필수**, Google 모드에서 POI 클릭 시 사용)
3. API 키 생성 (브라우저 키) 후 제한:
   - **HTTP referrer:** `https://beafksh.github.io/travel-planner-mvp-preview/*`
   - **API 제한:** Maps JavaScript API, Directions API (Legacy), **Places API**
4. GitHub Actions secret 이름: `VITE_GOOGLE_MAPS_API_KEY`

로컬 개발 시 referrer에 `http://localhost:*`도 추가하세요.

## 가능 / 불가 요약

| 항목 | OSM | Google |
|------|-----|--------|
| **A) 펼쳐진 Maps URL → 좌표·이름** | ✅ | ✅ (공유 UI) |
| **목록 링크 import** | ✅ | ✅ (공유 UI) |
| **B) 일자별 마커 + 동선** | ✅ OSRM | ✅ DirectionsService + DirectionsRenderer |
| **동선 실패 시** | ✅ 직선 Polyline | ✅ 직선 Polyline 폴백 |
| **등록 경로 4) 맵 클릭** | ✅ Nominatim | ✅ 빈 지도: Nominatim · POI: Places 상세 패널 |
| **Google 로그인** | — | ❌ 없음 |

## 사용법

### A) 링크 → 위치

1. **펼쳐진 URL** — 샘플 「펼쳐진 URL (센소지)」 클릭 → **Resolve**
2. **short link** — CORS 프록시 시도, 실패 시 수동 좌표 폴백
3. **수동 폴백** — 장소명 + lat/lng 입력
4. resolve 성공 후 **스팟 목록에 추가**

### 목록 링크 import

Google Maps 공유 목록 short link → **Import** → 지도에 추가

### B) S04형 지도 · 동선

- 초기: Day 2 도쿄 4스팟 (센소지 → 나카미세 → 우에노 → 아메요코)
- 번호 마커 + 동선 (OSM: OSRM 도보 / Google: Directions 도보)
- **OSM / Google Maps** 토글로 지도 제공자 전환

### 등록 경로 4) 맵 클릭으로 스팟 등록

**OSM 모드**
1. 지도에서 원하는 위치 **클릭**
2. 우측 등록 패널에서 이름 확인·수정 (Nominatim 역지오코딩)
3. **Day 동선에 스팟 추가** 또는 **후보스팟으로 추가**

**Google 모드**
1. **POI(장소) 클릭** → 좌측 지도 + **우측 상세 패널** (Places API: 이름·주소·평점·리뷰·사진)
   - **Day 스팟 추가** / **후보스팟 추가** CTA
2. **빈 지도 클릭** → 기존 좌표 등록 패널 (Nominatim 역지오코딩)
3. POI 클릭 시 Google 기본 정보창은 `stop()`으로 차단 — 좌표 등록 패널이 열리지 않음

## 한계

| 항목 | 설명 |
|------|------|
| **Google API 키** | 브라우저 키는 빌드 시 번들에 포함됨 (정상). 소스·PR·로그에 값 노출 금지 |
| **Directions waypoint** | Google Directions는 중간 경유지 최대 23개. 초과 시 직선 Polyline |
| **POI 클릭 (Google)** | `placeId`가 있는 POI만 Places 상세 패널 표시. `placeId` 없는 레이어·일부 POI는 빈 지도 클릭으로 처리됨. Places API 쿼터·리뷰는 최대 2건 샘플만 표시. 사진 attribution 필수 표시 |
| **Places API** | POI 상세 패널에 Places Details 사용. 키에 Places API 활성화·referrer 제한 필요. 조회 실패 시 패널에 오류 표시(크래시 없음) |
| **short link 파싱** | CORS 프록시 의존, 불안정 |
| **OSRM public** | 데모 서버 쿼터·가용성 제한 |
| **역지오코딩** | Nominatim 정책(약 1 req/sec). Google POI는 Places API 사용 |
| **목록 getlist API** | Google 비공식 엔드포인트, 변경·차단 가능 |

## 로컬 실행

```bash
cd poc/maps
npm install
cp .env.example .env   # Google 모드 테스트 시 키 입력
npm run dev
# → http://localhost:5173/travel-planner-mvp-preview/maps-poc/
```

## 빌드 · GitHub Pages 배포

```bash
cd poc/maps
npm run build
# 산출물: 레포 루트 maps-poc/ (Vite outDir)
```

- Vite `base`: `/travel-planner-mvp-preview/maps-poc/`
- GitHub Actions (`.github/workflows/maps-poc.yml`)가 main push 시 빌드·배포
- secret `VITE_GOOGLE_MAPS_API_KEY`가 없어도 빌드는 성공하고 OSM 모드가 동작합니다

## 프로젝트 구조

```
poc/maps/
├── src/
│   ├── components/
│   │   ├── maps/           # OsmMapView, GoogleMapView, MapClickPanel, PlaceDetailPanel
│   │   ├── DayRouteMap.tsx # 모드 토글 + 공유 상태
│   │   └── ...
│   └── lib/
│       ├── googleMapsConfig.ts
│       ├── googleDirectionsRoute.ts
│       ├── mapMode.ts
│       └── ...
├── .env.example
├── vite.config.ts
└── README.md

maps-poc/               # 빌드 산출물 (GitHub Pages)
```

## 기술 스택

- **OSM**: Leaflet + OpenStreetMap + OSRM public
- **Google**: `@react-google-maps/api` + DirectionsService/DirectionsRenderer
- **링크 파싱**: 클라이언트 정규식 (Google Maps URL 형식)
