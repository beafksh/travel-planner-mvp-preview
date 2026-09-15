# Travel Planner — Maps POC (`poc/maps/`)

Google Maps API **키·빌링 없이** OpenStreetMap + Leaflet으로 동작하는 최소 스파이크입니다.  
`wireframes/`, `s04/`, 루트 `index.html` 등 기존 기획·퍼블 산출물은 **수정하지 않습니다**.

## 공개 URL (GitHub Pages)

**main 브랜치 머지 후** 아래 주소에서 접속합니다:

https://beafksh.github.io/travel-planner-mvp-preview/maps-poc/

> PR 브랜치에서는 위 URL이 아직 갱신되지 않을 수 있습니다. 로컬 또는 PR 머지 후 확인하세요.

## 가능 / 불가 요약

| 항목 | 결과 | 비고 |
|------|------|------|
| **A) 펼쳐진 Maps URL → 좌표·이름** | ✅ 가능 | 브라우저 정규식 파서 (`client-parser-expanded`) |
| **A) short link (`maps.app.goo.gl`)** | ⚠️ 제한적 | CORS 프록시 시도, **실패율 높음** → 수동 좌표 폴백 필수 |
| **A) Place ID 확정** | ⚠️ URL에 포함된 경우만 | 유료 Google API 미사용 |
| **목록 링크 import** | ⚠️ 제한적 | 비공식 `entitylist/getlist` · CORS 프록시 · 예제 URL은 fixture 폴백 |
| **B) 일자별 마커 + 동선** | ✅ 가능 | Leaflet + OSM 타일 + OSRM public |
| **B) OSRM 실패 시** | ✅ 직선 Polyline 폴백 | 쿼터·가용성 이슈 시 자동 전환 |
| **Google API 키** | ❌ 불필요 | 완전 제거 |

## 사용법

### A) 링크 → 위치

1. **펼쳐진 URL** — 샘플 「펼쳐진 URL (센소지)」 클릭 → **Resolve**
   - `resolveMethod: client-parser-expanded`, lat/lng/name 표시
2. **short link** — `maps.app.goo.gl/...` 붙여넣기 → **Resolve**
   - CORS 프록시(`allorigins`, `corsproxy.io`)로 redirect follow 시도
   - 실패 시 오류 메시지 + **수동 좌표 입력 폼** 표시
3. **수동 폴백** — 장소명(선택) + lat/lng 입력 → **스팟 목록에 추가**
4. resolve 성공 후 **스팟 목록에 추가** 버튼으로 B) 지도에 반영

### 목록 링크 import

1. Google Maps **공유 목록** short link (`maps.app.goo.gl/...`) 입력 → **Import**
2. resolve 우선순위:
   - `VITE_RESOLVE_API_BASE` 설정 시 `POST {base}/api/maps/resolve-list-link`
   - 없으면 CORS 프록시로 redirect + `entitylist/getlist` 시도
   - 예제 URL(`maps.app.goo.gl/ZKGW1AaMWT2eePtd6`) 또는 listId `wkR0T1lyzscvuOSJnXq3qg`는 **fixture 폴백** (삿포로 65곳)
3. 제목 + N곳 확인 후 **지도에 추가** → 기존 스팟에 merge

### B) S04형 지도 · 동선

- 초기: Day 2 도쿄 4스팟 (센소지 → 나카미세 → 우에노 → 아메요코)
- 번호 마커 + OSRM 도보 경로 (실패 시 점선 직선)
- A)에서 추가한 스팟도 목록·지도에 반영

## 한계

| 항목 | 설명 |
|------|------|
| **short link 파싱** | 브라우저 CORS + 공개 프록시 의존. 불안정·느림·프록시 다운 시 실패. **펼쳐진 URL 또는 수동 입력 권장** |
| **OSRM public** | `router.project-osrm.org`는 데모 서버. 쿼터·속도 제한·간헐적 429/5xx. 실패 시 직선 Polyline |
| **CORS 프록시** | 제3자 서비스(allorigins, corsproxy.io). 가용성·정책 변경 가능 |
| **Place ID** | URL에 없으면 확정 불가 (Google Places API 미사용) |
| **목록 getlist API** | Google 비공식 내부 엔드포인트. 변경·차단·ToS 위반 가능성. 비공개 목록 실패 |
| **프로덕션** | 자체 OSRM/백엔드 프록시 또는 Nominatim 등 검토 필요 |

## 로컬 실행

```bash
cd poc/maps
npm install
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
- `maps-poc/` 디렉터리를 main에 커밋하면 GitHub Pages가 자동 서빙

## 프로젝트 구조

```
poc/maps/
├── src/
│   ├── components/     # LinkResolver, ListLinkImporter, DayRouteMap (Leaflet)
│   ├── data/           # Day 2 샘플 스팟, 삿포로 목록 fixture
│   └── lib/            # URL 파서, resolve, 목록 resolve, OSRM
├── vite.config.ts      # base + outDir → ../../maps-poc
└── README.md

maps-poc/               # 빌드 산출물 (GitHub Pages)
```

## 기술 스택

- **지도**: Leaflet + OpenStreetMap 타일
- **동선**: OSRM public (`router.project-osrm.org/route/v1/foot/...`)
- **링크 파싱**: 클라이언트 정규식 (Google Maps URL 형식)
- **short link**: 공개 CORS 프록시 (선택·폴백)

## 대략 공수 (인일, 프로덕션)

| 구분 | 추정 |
|------|------|
| 프론트 (Leaflet UI, 마커·동선) | 1.5–2 |
| 백엔드 (short link 프록시, 자체 OSRM) | 2–3 |
| 공통 (에러 처리, E2E) | 0.5–1 |
