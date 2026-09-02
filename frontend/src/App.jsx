import { useState, useEffect } from 'react';
import './App.css';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STATUS_LABELS = { sat: 'Seated', stood: 'Standing', out: 'Out of office' };
const NAV_ITEMS = ['Overview', 'Desks', 'Reports'];

// Само Desk 1 има реален хардуер засега. Останалите са визуални placeholder-и.
const DESKS = [1, 2, 3, 4, 5, 6];
const ACTIVE_DESKS = [1];
// Hardcoded, докато няма employees таблица.
const DESK_EMPLOYEES = { 1: 'Alex' };

const API_BASE = 'http://127.0.0.1:8000';

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

function statusAccent(status) {
  if (status === 'sat') return '#E8A33D';
  if (status === 'stood') return '#4FB286';
  return '#3E4048';
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

function Sidebar({ active, onSelect }) {
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
            onClick={() => onSelect(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ---------- Overview: статично описание на системата ---------- */

const PIPELINE = [
  'Shelly BLU Button',
  'MQTT (Mosquitto)',
  'Node-RED',
  'PostgreSQL',
  'FastAPI',
  'React',
];

const CAPABILITIES = [
  ['Live presence tracking', 'Текущото състояние на бюрото — седнал, изправен или извън офиса — се обновява на всеки 3 секунди.'],
  ['Work session history', 'Всяка работна сесия се записва с начало, край и разбивка колко време е прекарано седнало и изправено.'],
  ['Sit / stand breakdown', 'Съотношението седнало към изправено за последната приключила сесия.'],
  ['Durable storage', 'Данните живеят в PostgreSQL, не в паметта — преживяват рестарт на машината.'],
];

function Overview() {
  return (
    <div className="doc">
      <h2 className="section-title section-title--first">Какво прави системата</h2>
      <p className="doc__lead">
        Desk Presence следи кога едно работно бюро се използва и как. Физически бутон
        на бюрото отчита сядане и ставане, както и началото и края на работния ден.
        Всяко събитие се записва трайно, а приложението показва живото състояние и
        историята на работните сесии.
      </p>

      <h2 className="section-title">Как е изградена</h2>
      <div className="pipeline">
        {PIPELINE.map((step, i) => (
          <span key={step} className="pipeline__item">
            <span className="pipeline__step">{step}</span>
            {i < PIPELINE.length - 1 && <span className="pipeline__arrow">→</span>}
          </span>
        ))}
      </div>
      <p className="doc__note">
        Бутонът праща събитие по локален MQTT. Node-RED е единственият компонент,
        който пише в базата — разпознава единично натискане (сядане/ставане) от
        двойно (старт/край на работна сесия). FastAPI чете от PostgreSQL и не пише
        никога. React слоят само консумира готовите endpoint-и.
      </p>

      <h2 className="section-title">Текущи възможности</h2>
      <dl className="doc__list">
        {CAPABILITIES.map(([term, desc]) => (
          <div key={term} className="doc__item">
            <dt>{term}</dt>
            <dd>{desc}</dd>
          </div>
        ))}
      </dl>

      <p className="doc__footnote">
        Phase 1 покрива едно бюро и един потребител. Схемата на базата поддържа
        няколко бюра от самото начало, затова разширяването не изисква миграция.
      </p>
    </div>
  );
}

/* ---------- Данни за едно бюро ---------- */

function useDeskData(deskId) {
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [workSessions, setWorkSessions] = useState([]);

  useEffect(() => {
    const fetchStatus = () => {
      fetch(`${API_BASE}/status`)
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
  }, [deskId]);

  useEffect(() => {
    const fetchWorkSessions = () => {
      fetch(`${API_BASE}/work-sessions`)
        .then((res) => res.json())
        .then((data) => setWorkSessions(data))
        .catch(() => {});
    };
    fetchWorkSessions();
    const interval = setInterval(fetchWorkSessions, 5000);
    return () => clearInterval(interval);
  }, [deskId]);

  return { status, connected, workSessions };
}

/* ---------- Компактна карта, преди детайлите ---------- */

function DeskSummaryCard({ deskId, employee, status }) {
  const state = status?.status || 'out';
  return (
    <div className="desk-list">
      <div className="desk-row" data-status={state}>
        <div className="desk-row__avatar">D{deskId}</div>
        <div className="desk-row__info">
          <div className="desk-row__name">Desk {deskId}</div>
          <div className="desk-row__email">{employee || 'Unassigned'}</div>
        </div>
        <div className="desk-row__status">
          <StatusDot status={state} />
          <span>{STATUS_LABELS[state]}</span>
          <span className="desk-row__time">
            {status?.elapsed_seconds != null ? formatElapsed(status.elapsed_seconds) : 'No active session'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- Детайли за едно бюро ---------- */

function DeskDetail({ deskId }) {
  const { status, connected, workSessions } = useDeskData(deskId);
  const lastSession = workSessions[0];

  return (
    <>
      <DeskSummaryCard deskId={deskId} employee={DESK_EMPLOYEES[deskId]} status={status} />

      <div className={`connection-pill connection-pill--${connected ? 'up' : 'down'}`}>
        <span className="connection-pill__dot" />
        {connected ? 'Connected' : 'Disconnected'}
      </div>

      <div className="stats-row">
        <StatCard
          label="Current Status"
          value={STATUS_LABELS[status?.status] || 'Loading...'}
          accent={statusAccent(status?.status)}
        />
        <StatCard
          label="Duration"
          value={status?.elapsed_seconds != null ? formatElapsed(status.elapsed_seconds) : 'No active session'}
          accent="#7C86A6"
        />
      </div>

      <div className="overview-grid">
        <div>
          {lastSession && (
            <>
              <h2 className="section-title section-title--first">Last Session</h2>
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
          <h2 className="section-title section-title--first">Recent Sessions</h2>
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
    </>
  );
}

/* ---------- Desks таб с под-навигация ---------- */

function DesksView() {
  const [activeDesk, setActiveDesk] = useState(1);

  return (
    <div>
      <div className="desk-tabs">
        {DESKS.map((id) => {
          const enabled = ACTIVE_DESKS.includes(id);
          return (
            <button
              key={id}
              className={[
                'desk-tab',
                activeDesk === id && enabled ? 'desk-tab--active' : '',
                enabled ? '' : 'desk-tab--disabled',
              ].filter(Boolean).join(' ')}
              onClick={() => enabled && setActiveDesk(id)}
              disabled={!enabled}
              title={enabled ? undefined : `Desk ${id} — няма свързан хардуер засега`}
            >
              Desk {id}
            </button>
          );
        })}
      </div>

      <DeskDetail deskId={activeDesk} />
    </div>
  );
}

/* ---------- Reports placeholder ---------- */

function Reports() {
  return (
    <div className="placeholder">
      <div className="placeholder__title">Coming soon</div>
      <p className="placeholder__text">CSV export на работните сесии ще се появи тук.</p>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="layout">
      <Sidebar active={activeTab} onSelect={setActiveTab} />

      <main className="main">
        <header className="app-header">
          <div className="app-header__mark">D</div>
          <div>
            <h1>Desk Presence</h1>
            <p className="app-header__sub">Office floor, live</p>
          </div>
        </header>

        {activeTab === 'Overview' && <Overview />}
        {activeTab === 'Desks' && <DesksView />}
        {activeTab === 'Reports' && <Reports />}
      </main>
    </div>
  );
}

export default App;
