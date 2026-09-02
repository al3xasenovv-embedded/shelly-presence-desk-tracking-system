from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

import csv
import io
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


def run_query(query, params=None):
    conn = psycopg2.connect(**DB_CONFIG)
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(query, params)
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

# ---------------------------------------------------------------------------
# CSV export
#
# Колоните са фиксирани и еднакви за трите endpoint-а, за да е предвидим
# форматът за всеки, който ги чете после.
#
# Филтърът по период ползва LOCALTIMESTAMP, не NOW(): колоните са
# `timestamp without time zone` и съдържат локално време (виж конвенцията
# по-горе), а LOCALTIMESTAMP също връща naive локално време — сравняват се
# пряко, без implicit каст между naive и tz-aware.
# ---------------------------------------------------------------------------

CSV_COLUMNS = [
    "session_start",
    "session_end",
    "total_sat_seconds",
    "total_stood_seconds",
    "total_session_seconds",
    "day_of_week",
    "user_id",
]

SELECT_COLUMNS = ", ".join(CSV_COLUMNS)


def rows_to_csv(rows):
    """Сериализира RealDictRow редове в CSV текст през csv.writer."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(CSV_COLUMNS)
    for row in rows:
        writer.writerow([row[column] for column in CSV_COLUMNS])
    return buffer.getvalue()


def csv_response(rows, filename):
    return Response(
        content=rows_to_csv(rows),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/export/session/{session_id}")
def export_session(session_id: int):
    rows = run_query(
        f"SELECT {SELECT_COLUMNS} FROM work_sessions WHERE id = %s",
        (session_id,),
    )
    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"Няма work_sessions запис с id {session_id}",
        )
    return csv_response(rows, f"session_{session_id}.csv")


@app.get("/export/user/{user_id}/range")
def export_user_range(user_id: int, days: int = Query(5, ge=1)):
    rows = run_query(
        f"""SELECT {SELECT_COLUMNS} FROM work_sessions
            WHERE user_id = %s
              AND session_start >= LOCALTIMESTAMP - make_interval(days => %s)
            ORDER BY session_start DESC""",
        (user_id, days),
    )
    return csv_response(rows, f"user_{user_id}_last_{days}_days.csv")


@app.get("/export/all")
def export_all(days: int = Query(1, ge=1)):
    rows = run_query(
        f"""SELECT {SELECT_COLUMNS} FROM work_sessions
            WHERE session_start >= LOCALTIMESTAMP - make_interval(days => %s)
            ORDER BY session_start DESC""",
        (days,),
    )
    return csv_response(rows, f"all_users_last_{days}_days.csv")
