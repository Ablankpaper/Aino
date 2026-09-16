"""Thread-safe display receipts for the HTTP calls belonging to a managed turn."""

from threading import RLock


class TurnCallTracker:
    def __init__(self):
        self._lock = RLock()
        self._calls = []
        self._background = 0
        self._foreground_done = False
        self._revision = 0
        self._listener = None

    def snapshot(self):
        with self._lock:
            return {"calls": [dict(call) for call in self._calls],
                    "calls_complete": self._foreground_done and self._background == 0,
                    "revision": self._revision}

    def _changed(self):
        self._revision += 1
        if self._listener:
            self._listener(self.snapshot())
        if self._foreground_done and self._background == 0:
            self._listener = None

    def record(self, call_id, purpose):
        with self._lock:
            self._calls.append({"call_id": call_id, "purpose": purpose})
            self._changed()

    def start_background(self):
        with self._lock:
            self._background += 1
            self._changed()

    def end_background(self):
        with self._lock:
            self._background -= 1
            self._changed()

    def finish_and_watch(self, listener):
        # Serialize initial persistence with late dispatches and background completion.
        with self._lock:
            self._foreground_done = True
            self._listener = listener
            self._changed()

