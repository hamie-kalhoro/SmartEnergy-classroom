"""Reads the classroom ESP32's USB serial messages and keeps its live state in memory.

The firmware switches the relays by itself; this bridge only observes it. The one
thing it can do to the board is pulse the reset line (see request_reset).
"""
import logging
import os
import re
import threading
import time
from collections import deque
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

BAUD_RATE = 115200
USB_BRIDGE_IDS = (0x10C4, 0xEA60)  # CP2102 USB-to-UART chip on the ESP32 board
RETRY_SECONDS = 2
MAX_EVENTS = 50

ENTRY_RE = re.compile(r"\[\+ ENTRY\].*Total Students:\s*(-?\d+)")
EXIT_RE = re.compile(r"\[- EXIT\].*Total Students:\s*(-?\d+)")
LOAD_RE = re.compile(r"--> Load:\s*(\d+)%")
BOOT_MARKER = "SMART CLASSROOM LOAD MANAGEMENT INITIALIZED"

# Occupancy at which each load stage starts, highest first. Only used to fill in the
# load until the firmware next reports it, because it only prints the load on a change.
STAGE_THRESHOLDS = ((6, 100), (1, 50), (0, 0))


def devices_for_load(load_percent):
    if load_percent is None:
        return None
    first_stage = load_percent >= 50
    second_stage = load_percent >= 100
    return {
        'light_1': first_stage,
        'fan_1': first_stage,
        'light_2': second_stage,
        'fan_2': second_stage,
    }


def load_for_students(students):
    for threshold, load_percent in STAGE_THRESHOLDS:
        if students >= threshold:
            return load_percent
    return 0


class HardwareBridge:
    def __init__(self, port=None):
        self.port = port or os.getenv('HARDWARE_SERIAL_PORT') or None
        self._lock = threading.Lock()
        self._thread = None
        self._serial = None
        self._connected = False
        self._active_port = None
        self._error = None
        self._students = None
        self._load_percent = None
        self._entries = 0
        self._exits = 0
        self._last_event_at = None
        self._next_event_id = 1
        self._events = deque(maxlen=MAX_EVENTS)
        self._listeners = []

    def add_listener(self, listener):
        """Call listener(event) for each new event. A failing listener cannot stop the bridge."""
        self._listeners.append(listener)

    def start(self):
        if self._thread is None:
            self._thread = threading.Thread(target=self._run, daemon=True, name='hardware-bridge')
            self._thread.start()

    def snapshot(self):
        with self._lock:
            return {
                'connected': self._connected,
                'port': self._active_port,
                'error': self._error,
                'students': self._students,
                'load_percent': self._load_percent,
                'devices': devices_for_load(self._load_percent),
                'entries': self._entries,
                'exits': self._exits,
                'last_event_at': self._last_event_at,
                'events': list(self._events),
            }

    def request_reset(self):
        """Restart the board via its reset line, which also zeroes the firmware's count."""
        with self._lock:
            if not self._connected or self._serial is None:
                return False
            self._serial.rts = True
            time.sleep(0.2)
            self._serial.rts = False
            return True

    def handle_line(self, line):
        """Apply one line of firmware output. Unrecognised lines are ignored."""
        event = None
        with self._lock:
            if match := ENTRY_RE.search(line):
                self._entries += 1
                self._apply_count(int(match.group(1)))
                event = self._record('entry', line, students=self._students)
            elif match := EXIT_RE.search(line):
                self._exits += 1
                self._apply_count(int(match.group(1)))
                event = self._record('exit', line, students=self._students)
            elif match := LOAD_RE.search(line):
                self._load_percent = int(match.group(1))
                event = self._record('load', line, load_percent=self._load_percent)
            elif BOOT_MARKER in line:
                self._students = 0
                self._load_percent = 0
                event = self._record('boot', line)

        if event:
            for listener in self._listeners:
                try:
                    listener(event)
                except Exception:
                    logger.exception('A hardware event listener failed.')

    def _apply_count(self, students):
        self._students = students
        if self._load_percent is None:
            self._load_percent = load_for_students(students)

    def _record(self, event_type, message, **fields):
        now = datetime.now(timezone.utc).isoformat()
        self._last_event_at = now
        event = {
            'id': self._next_event_id,
            'type': event_type,
            'message': message,
            'at': now,
            **fields,
        }
        self._events.appendleft(event)
        self._next_event_id += 1
        return event

    def _find_port(self):
        if self.port:
            return self.port
        from serial.tools import list_ports
        for info in list_ports.comports():
            if (info.vid, info.pid) == USB_BRIDGE_IDS:
                return info.device
        return None

    def _set_disconnected(self, error):
        with self._lock:
            self._serial = None
            self._connected = False
            self._active_port = None
            self._error = error

    def _run(self):
        try:
            import serial
        except ImportError:
            self._set_disconnected('pyserial is not installed on the backend.')
            return

        while True:
            port = self._find_port()
            if not port:
                self._set_disconnected('Board not detected. Check the USB cable.')
                time.sleep(RETRY_SECONDS)
                continue
            try:
                self._read_port(serial, port)
                self._set_disconnected('Connection to the board closed.')
            except (serial.SerialException, OSError) as e:
                self._set_disconnected(f'Cannot read {port}. Is another program using it? ({e})')
            time.sleep(RETRY_SECONDS)

    def _read_port(self, serial, port):
        ser = serial.Serial()
        ser.port = port
        ser.baudrate = BAUD_RATE
        ser.timeout = 0.5
        # Keep both control lines low: opening the port must not reset the board.
        ser.dtr = False
        ser.rts = False
        ser.open()
        with ser:
            with self._lock:
                self._serial = ser
                self._connected = True
                self._active_port = port
                self._error = None
                # The board may have changed while nothing was listening.
                self._students = None
                self._load_percent = None
            while True:
                line = ser.readline().decode('ascii', errors='replace').strip()
                if line:
                    self.handle_line(line)


bridge = HardwareBridge()
