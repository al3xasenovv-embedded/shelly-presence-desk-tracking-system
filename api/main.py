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


@app.get("/")
def read_root():
    return {"message": "Desk Presence API is running"}

@app.get("/sessions/recent")
def get_recent_sessions():
    return run_query("SELECT * FROM desk_sessions ORDER BY id DESC LIMIT 10")

@app.get("/work-sessions")
def get_work_sessions():
    return run_query("SELECT * FROM work_sessions ORDER BY id DESC LIMIT 10")

@app.get("/status")
def get_status():
    rows = run_query("SELECT * FROM desk_sessions ORDER BY id DESC LIMIT 1")
    last_event = rows[0]
    last_state = last_event["event_type"]
    last_timestamp  = last_event["timestamp"]

    elapsed_time = datetime.now() - last_timestamp
    elapsed_seconds = int(elapsed_time.total_seconds())


    current_state = "stood" if last_state == "sat" else "sat"

    return {"status": current_state , "elapsed_seconds": elapsed_seconds}