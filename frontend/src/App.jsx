import { useState, useEffect } from 'react';
import './App.css';

const STATUS_LABELS = { sat: 'Seated', stood: 'Standing', out: 'Out of office' };
const NAV_ITEMS = ['Overview', 'Desks', 'Sessions', 'Reports', 'Settings'];

function StatusDot({ status }) {
  return <span className={`status-dot status-dot--${status}`} />;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="stat-card" style={{ '--accent': accent }}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s ago`;
  return `${minutes}m ${secs}s ago`;
}

function Sidebar() {
  const [active, setActive] = useState('Overview');
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__mark">D</div>
        <span>Desk Presence</span>
      </div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            className={`sidebar__link ${active === item ? 'sidebar__link--active' : ''}`}
            onClick={() => setActive(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function App() {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const fetchStatus = () => {
      fetch('http://127.0.0.1:8000/status')
        .then((res) => res.json())
        .then((data) => {
          setStatus(data);
          setConnected(true);
        })
        .catch(() => setConnected(false));
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const seated = status?.status === 'sat' ? 1 : 0;
  const standing = status?.status === 'stood' ? 1 : 0;

  return (
    <div className="layout">
      <Sidebar />

      <main className="main">
        <header className="app-header">
          <div className="app-header__mark">D</div>
          <div>
            <h1>Desk Presence</h1>
            <p className="app-header__sub">Office floor, live</p>
          </div>
        </header>

        <div className={`connection-pill connection-pill--${connected ? 'up' : 'down'}`}>
          <span className="connection-pill__dot" />
          {connected ? 'Connected' : 'Disconnected'}
        </div>

        <div className="stats-row">
          <StatCard label="Seated" value={seated} accent="#E8A33D" />
          <StatCard label="Standing" value={standing} accent="#4FB286" />
          <StatCard label="Desks tracked" value={1} accent="#7C86A6" />
        </div>

        {status && (
          <div className="desk-list">
            <div className="desk-row" data-status={status.status}>
              <div className="desk-row__avatar">D1</div>
              <div className="desk-row__info">
                <div className="desk-row__name">Desk 1</div>
                <div className="desk-row__email">Live from Node-RED</div>
              </div>
              <div className="desk-row__status">
                <StatusDot status={status.status} />
                <span>{STATUS_LABELS[status.status]}</span>
                <span className="desk-row__time">{formatElapsed(status.elapsed_seconds)}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;