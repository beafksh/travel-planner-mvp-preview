interface MapPlaceholderProps {
  title?: string;
}

export function MapPlaceholder({ title = 'Google Maps API 키가 필요합니다' }: MapPlaceholderProps) {
  return (
    <div className="map-placeholder" role="status">
      <div className="map-placeholder-inner">
        <h3>{title}</h3>
        <p>
          <code>poc/maps/.env</code> 파일에 아래 변수를 설정한 후 dev 서버를 재시작하세요.
        </p>
        <pre className="code-block">VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</pre>
        <ul>
          <li>Google Cloud Console에서 <strong>Maps JavaScript API</strong> 활성화</li>
          <li><strong>Directions API (Legacy)</strong> 활성화 (동선 B 데모)</li>
          <li>결제(빌링) 계정 연결 필요 — 무료 크레딧 한도 내 사용 가능</li>
        </ul>
        <p className="muted">
          키 없이도 A(링크 리졸버) 데모는 동작합니다. B(지도·동선)만 플레이스홀더로 표시됩니다.
        </p>
      </div>
    </div>
  );
}
