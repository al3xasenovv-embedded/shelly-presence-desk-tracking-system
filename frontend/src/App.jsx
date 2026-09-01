import { useState, useEffect } from 'react';
import './App.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const [workSessions, setWorkSessions] = useState([]);

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

  useEffect(() => {
    const fetchWorkSessions = () => {
      fetch('http://127.0.0.1:8000/work-sessions')
        .then((res) => res.json())
        .then((data) => setWorkSessions(data));
    };
    fetchWorkSessions();
    const interval = setInterval(fetchWorkSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  const seated = status?.status === 'sat' ? 1 : 0;
  const standing = status?.status === 'stood' ? 1 : 0;
  const lastSession = workSessions[0];

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
          <StatCard
            label="Current Status"
            value={STATUS_LABELS[status?.status] || 'Loading...'}
            accent={status?.status === 'sat' ? '#E8A33D' : status?.status === 'stood' ? '#4FB286' : '#3E4048'}
          />
          <StatCard
            label="Duration"
            value={status?.elapsed_seconds != null ? formatElapsed(status.elapsed_seconds) : 'No active session'}
            accent="#7C86A6"
          />
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
                <span className="desk-row__time">
                  {status.elapsed_seconds !== null ? formatElapsed(status.elapsed_seconds) : 'No active session'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="overview-grid">
          <div>
            {lastSession && (
              <>
                <h2 className="section-title">Last Session</h2>
                <div className="chart-card">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Seated', value: lastSession.total_sat_seconds },
                          { name: 'Standing', value: lastSession.total_stood_seconds },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        <Cell fill="#E8A33D" />
                        <Cell fill="#4FB286" />
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatDuration(value)}
                        contentStyle={{ background: '#1A1B21', border: '1px solid #24262E', borderRadius: 8 }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="chart-card__total">
                    Total session: {formatDuration(lastSession.total_session_seconds)}
                  </div>
                </div>
              </>
            )}
          </div>

          <div>
            <h2 className="section-title">Recent Sessions</h2>
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Seated</th>
                  <th>Standing</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {workSessions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.day_of_week}</td>
                    <td>{formatTime(s.session_start)}</td>
                    <td>{formatTime(s.session_end)}</td>
                    <td>{formatDuration(s.total_sat_seconds)}</td>
                    <td>{formatDuration(s.total_stood_seconds)}</td>
                    <td>{formatDuration(s.total_session_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
