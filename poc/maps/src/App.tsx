import { DayRouteMap } from './components/DayRouteMap';
import { LinkResolver } from './components/LinkResolver';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Travel Planner — Maps POC</h1>
        <p className="muted">
          최소 스파이크 · <code>poc/maps/</code> 전용 (wireframes/, s04/ 미변경)
        </p>
      </header>
      <main className="app-main">
        <LinkResolver />
        <DayRouteMap />
      </main>
      <footer className="app-footer muted">
        POC — 프로덕션 연동 전 가설 검증용
      </footer>
    </div>
  );
}
