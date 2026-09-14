# S04 Day 맵+보드 — 정적 퍼블 프로토타입

시안·퍼블 방향 v0.1 + MVP 가정 반영 정적 HTML/CSS.

## 열기

브라우저에서 `index.html`을 직접 열면 됩니다.

```bash
# 예: 로컬 서버 (선택)
cd /workspace/travel-planner-dp/s04-pub
python3 -m http.server 8080
# → http://localhost:8080
```

또는 파일 URL: `file:///…/travel-planner-dp/s04-pub/index.html`

## 확인 포인트

| 뷰포트 | 기대 |
|--------|------|
| **&lt;900px** | 세그먼트 `맵 \| 보드`, **기본 보드**. 맵 탭 시 풀폭 맵 + 하단 피크 시트 |
| **≥900px** | 맵 **60%** / 보드 **40%** 스플릿 + 시각적 스플리터. 세그먼트·피크 시트 숨김 |

- 핀 ↔ 카드 클릭 시 동일 번호·Accent 하이라이트 동기 (가벼운 JS)
- 보드 카드 ~72px: 핸들 · 번호 · 썸네일 · 이름 · 라벨 · 스티커(최대 3 +N) · ▲▼
- 하단 고정 라벨/스티커 팔레트 샘플
- Pretendard CDN (실패 시 system-ui 스택)

## 파일

- `index.html` — 마크업 + 최소 인터랙션
- `styles.css` — 토큰·반응형
