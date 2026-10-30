"""Records the board's sensor events in a local SQLite file, separate from the main database.

Nothing here touches Supabase or the website's tables, so hardware activity cannot
change what the rest of the application stores or shows.
"""
import os
import sqlite3
import threading
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hardware_data')
DEFAULT_DB_PATH = os.path.join(DATA_DIR, 'events.db')

RECORDED_TYPES = ('entry', 'exit', 'boot')
SESSION_GAP_SECONDS = 1800
MIN_SESSION_EVENTS = 4


class HardwareEventStore:
    def __init__(self, path=DEFAULT_DB_PATH):
        self.path = path
        self._lock = threading.Lock()
        self._ready = False

    def _connect(self):
        conn = sqlite3.connect(self.path, timeout=5)
        if not self._ready:
            conn.execute(
                'CREATE TABLE IF NOT EXISTS events ('
                'id INTEGER PRIMARY KEY AUTOINCREMENT, '
                'at REAL NOT NULL, type TEXT NOT NULL, students INTEGER)'
            )
            conn.commit()
            self._ready = True
        return conn

    def append(self, event):
        """Save one bridge event. Load changes are skipped: they follow from the count."""
        if event['type'] not in RECORDED_TYPES:
            return
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        at = datetime.fromisoformat(event['at']).timestamp()
        with self._lock:
            conn = self._connect()
            try:
                with conn:
                    conn.execute(
                        'INSERT INTO events (at, type, students) VALUES (?, ?, ?)',
                        (at, event['type'], event.get('students')),
                    )
            finally:
                conn.close()

    def load_sessions(self):
        """Return recorded sessions as lists of (time, type, students).

        A session ends when the board restarts or after a long silence. Sessions too
        short to learn from are left out.
        """
        if not os.path.exists(self.path):
            return []
        with self._lock:
            conn = self._connect()
            try:
                rows = conn.execute('SELECT at, type, students FROM events ORDER BY at, id').fetchall()
            finally:
                conn.close()

        sessions, current = [], []
        for at, event_type, students in rows:
            if current and (event_type == 'boot' or at - current[-1][0] > SESSION_GAP_SECONDS):
                sessions.append(current)
                current = []
            current.append((at, event_type, students))
        if current:
            sessions.append(current)
        return [s for s in sessions if len([e for e in s if e[1] != 'boot']) >= MIN_SESSION_EVENTS]


store = HardwareEventStore()
