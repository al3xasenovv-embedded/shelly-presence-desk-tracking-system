-- KadeSI — PostgreSQL schema
--
-- Run against the application database (the code expects `iot_demo`):
--   createdb -U postgres iot_demo
--   psql -U postgres -d iot_demo -f schema.sql
--
-- TIME CONVENTION
-- Both timestamp columns are `timestamp without time zone` and hold LOCAL
-- time (Europe/Sofia). Node-RED writes them through a localISO() helper that
-- strips the UTC offset, and FastAPI compares them against datetime.now().
-- The ALTER DATABASE below aligns the server so that NOW(), LOCALTIMESTAMP and
-- CURRENT_TIMESTAMP agree with the stored values; without it they return UTC
-- and every interval filter is off by the local offset.

ALTER DATABASE iot_demo SET TimeZone = 'Europe/Sofia';

-- Raw sit/stand events. One row per completed sat or stood period:
-- event_type is the state that just ENDED, duration_seconds is how long it lasted.
CREATE TABLE IF NOT EXISTS desk_sessions (
    id               SERIAL PRIMARY KEY,
    user_id          INTEGER DEFAULT 1,
    event_type       TEXT      NOT NULL,
    timestamp        TIMESTAMP NOT NULL,
    duration_seconds INTEGER
);

-- Work sessions, written with an INSERT-at-start / UPDATE-at-end pattern.
-- A row with session_end IS NULL is a session that is currently open, so the
-- totals stay NULL until the session is closed.
CREATE TABLE IF NOT EXISTS work_sessions (
    id                    SERIAL PRIMARY KEY,
    user_id               INTEGER DEFAULT 1,
    session_start         TIMESTAMP NOT NULL,
    session_end           TIMESTAMP,
    total_sat_seconds     INTEGER,
    total_stood_seconds   INTEGER,
    total_session_seconds INTEGER,
    day_of_week           TEXT
);
