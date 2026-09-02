from fastapi import FastAPI
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

import psycopg2
import psycopg2.extras

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "dbname": "iot_demo",
    "user": "postgres",
    "password": "1811"  
}


def run_query(query):
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(query)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return rows

def get_active_session():
    rows = run_query("SELECT * FROM work_sessions WHERE session_end IS NULL ORDER BY id DESC LIMIT 1")
    if rows:
        return rows[0]
    return None

@app.get("/")
def read_root():
    return {"message": "Desk Presence API is running"}

@app.get("/sessions/recent")
def get_recent_sessions():
    return run_query("SELECT * FROM desk_sessions ORDER BY id DESC LIMIT 10")

@app.get("/work-sessions")
def get_work_sessions():
    return run_query("SELECT * FROM work_sessions ORDER BY id DESC LIMIT 10")

# КОНВЕНЦИЯ ЗА ВРЕМЕ: всички timestamp колони са `timestamp without time zone`
# и съдържат ЛОКАЛНО време (Europe/Sofia), записано от Node-RED чрез localISO().
# Затова datetime.now() (също локално) е правилната база за сравнение — НЕ utcnow().
@app.get("/status")
def get_status():
    active_session = get_active_session()

    if not active_session:
        return {"status": "out", "elapsed_seconds": None}

    rows = run_query("SELECT * FROM desk_sessions ORDER BY id DESC LIMIT 1")

    session_start = active_session["session_start"]

    if not rows or rows[0]["timestamp"] < session_start:
        # никакво sat/stood превключване откакто сесията е стартирала
        current_state = "sat"
        reference_time = session_start
    else:
        last_event = rows[0]
        last_state = last_event["event_type"]
        current_state = "stood" if last_state == "sat" else "sat"
        reference_time = last_event["timestamp"]

    elapsed_seconds = int((datetime.now() - reference_time).total_seconds())

    return {"status": current_state, "elapsed_seconds": elapsed_seconds}