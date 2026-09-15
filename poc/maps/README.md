# Travel Planner — Maps POC (`poc/maps/`)

Google Maps 연동 가능 여부를 검증하는 **최소 스파이크**입니다.  
`wireframes/`, `s04/`, 루트 `index.html` 등 기존 기획·퍼블 산출물은 **수정하지 않습니다**.

## 가능 / 불가 요약

| 항목 | POC 결과 | 비고 |
|------|----------|------|
| **A) 펼쳐진 Maps URL → 좌표·이름** | ✅ 가능 | 브라우저 정규식 파서 (`place/@lat,lng`) |
| **A) short link (`maps.app.goo.gl`) 실resolve** | ⚠️ 서버 필요 | 브라우저 CORS로 redirect follow 불가. POC는 Vite 스텁 + 문서화 |
| **A) Place ID 확정** | ⚠️ API 키 필요 | URL 파싱만으로는 불안정. 공식: Maps URL Resolve API |
| **B) 일자별 마커 + 동선** | ✅ 가능 | Maps JS API + Directions API (Legacy), API 키·빌링 필요 |
| **B) 키 없이 UI** | ✅ 가능 | 플레이스홀더 표시, 크래시 없음 |

## 필요 API · 키 · 제약

### 프론트엔드 (B 데모)

| API | 용도 | 환경 변수 |
|-----|------|-----------|
| **Maps JavaScript API** | 지도·마커 | `VITE_GOOGLE_MAPS_API_KEY` |
| **Directions API (Legacy)** | 스팟 간 동선 | 동일 키 |

- Google Cloud **결제(빌링) 계정** 연결 필요 (무료 크레딧 한도 내 사용 가능)
- API 키는 HTTP 리퍼러(로컬: `http://localhost:5173/*`) 제한 권장
- **Google 로그인 UI/플로우는 POC에 포함하지 않음**

### 백엔드 (A short link — 프로덕션 경로)

POC 스텁(`POST /api/maps/resolve-link`)은 개발용입니다. 프로덕션에서는 아래 순서를 권장합니다.

#### 1) 공식 (Experimental) — Maps URL Resolve API

```
POST https://mapstools.googleapis.com/v1alpha:resolveMapsUrls
Authorization: Bearer <OAuth 또는 API 키>
Content-Type: application/json

{ "urls": ["https://maps.app.goo.gl/xxxx"] }
```

- 응답에서 Place ID (`places/ChIJ...`) 추출
- 이어서 **Places API (New) Place Details** 또는 **Geocoding API** `place_id:` 로 lat/lng·name·formattedAddress 확정

#### 2) Fallback — 서버 redirect follow + URL 파싱

- 서버에서 short URL `GET` → `redirect: follow` → 최종 `google.com/maps/place/.../@lat,lng` 파싱
- API 키 없이 **좌표만** 뽑는 경우도 있으나 **ToS·불안정** — Place ID·정식 주소는 API 경로 권장

#### 제약

- short link 실resolve는 **서버 키 없이 완전 동작 불가** (브라우저 단독 불가) → POC 합격선: **스텁 + 문서**
- Experimental API는 변경·제한 가능성 있음

## 실행 방법

```bash
cd poc/maps
cp .env.example .env
# .env 에 VITE_GOOGLE_MAPS_API_KEY 설정 (B 데모용, A는 키 없이 가능)

npm install
npm run dev
```

브라우저: `http://localhost:5173`

## A / B 데모 방법

### A) 공유 링크 → 위치

1. **펼쳐진 URL** — 샘플 버튼 「펼쳐진 URL (센소지)」 → **Resolve**
   - `source: client-parser`, name/lat/lng 표시
2. **short link 스텁** — 「short link 스텁 (sensoji-demo)」 → **Resolve**
   - Vite dev 서버의 `POST /api/maps/resolve-link` → `source: stub-mock`
3. **실제 short link** (네트워크 허용 시) — 서버가 redirect follow 시도 → `source: stub-redirect` 또는 에러

### B) S04 일자별 마커 + 동선

- S04 와이어 Day 2 (센소지 → 나카미세 → 우에노 공원 → 아메요코) 4개 스팟
- 번호 마커 + **DirectionsService** / **DirectionsRenderer** (도보 경로)
- API 키 미설정 시: 플레이스홀더 + 스팟 목록만 표시

## 프로젝트 구조

```
poc/maps/
├── src/
│   ├── components/     # LinkResolver, DayRouteMap
│   ├── data/           # 하드코딩 Day 2 스팟
│   └── lib/            # 클라이언트 URL 파서
├── server/             # Vite 미들웨어 스텁 (resolve-link)
├── .env.example
└── README.md
```

## 대략 공수 (인일)

| 구분 | 작업 | 추정 |
|------|------|------|
| 프론트 | Maps 컴포넌트, 마커·동선, 링크 입력 UI | 2–3 |
| 프론트 | 펼쳐진 URL 클라이언트 파서 | 0.5 |
| 백엔드 | resolve-link API (Resolve API + Place Details) | 2–3 |
| 백엔드 | redirect fallback·에러 처리·캐시 | 1–2 |
| 공통 | 키·빌링·쿼터 모니터링, E2E | 1 |

*POC 스파이크 자체는 위 범위의 일부만 구현 (스텁·문서 중심).*
