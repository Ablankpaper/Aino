"""Regression: the verification-evidence ledger must close every connection.

Sibling of the cron execution-ledger leak (#69567 / PR #69594). The evidence
ledger used ``with _connect() as conn:`` where the connection context manager
commits/rolls back but never closes, leaking the db/-wal/-shm file descriptors
on every recorded terminal result, workspace edit, and status read. These tests
fail if the deterministic ``close()`` is ever removed again.
"""

import sqlite3

import pytest

from agent import verification_evidence as ve


@pytest.fixture(autouse=True)
def _ledger_on(monkeypatch):
    """The ledger is inert unless verify-on-stop is enabled; these tests exercise the ledger."""
    monkeypatch.setenv("HERMES_VERIFY_ON_STOP", "1")


def _point_ledger(monkeypatch, tmp_path):
    monkeypatch.setattr(ve, "_db_path", lambda: tmp_path / "verification_evidence.db")
    return ve


def _track_connections(monkeypatch):
    opened, closed = [], []
    real_connect = sqlite3.connect

    def tracking_connect(*args, **kwargs):
        # Preserve the production factory's connection tracking and close behavior.
        factory = kwargs.get("factory", sqlite3.Connection)

        class TrackingConnection(factory):
            def close(self):
                super().close()
                closed.append(id(self))

        kwargs["factory"] = TrackingConnection
        conn = real_connect(*args, **kwargs)
        opened.append(id(conn))
        return conn

    monkeypatch.setattr(ve.sqlite3, "connect", tracking_connect)
    return opened, closed


def _python_project(root):
    (root / "pyproject.toml").write_text("[tool.pytest.ini_options]\n")


def test_ledger_operations_close_every_connection(monkeypatch, tmp_path):
    """Recording, editing, and status reads must close every connection opened."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path / ".hermes"))
    _point_ledger(monkeypatch, tmp_path)
    _python_project(tmp_path)
    opened, closed = _track_connections(monkeypatch)

    ve.record_terminal_result(
        command="python -m pytest tests/test_calc.py::test_even -q",
        cwd=tmp_path, session_id="s1", exit_code=0, output="1 passed",
    )
    ve.verification_status(session_id="s1", cwd=tmp_path)
    ve.mark_workspace_edited(session_id="s1", cwd=tmp_path, paths=["mod.py"])

    assert opened, "expected at least one connection to be opened"
    assert len(opened) == len(closed)
    assert set(opened) == set(closed)


def test_exception_during_operation_still_closes_connection(monkeypatch, tmp_path):
    """A failing statement inside the transaction must roll back and close."""
    _point_ledger(monkeypatch, tmp_path)
    opened, closed = _track_connections(monkeypatch)

    with pytest.raises(sqlite3.IntegrityError):
        with ve._transaction() as conn:
            # Missing NOT NULL columns -> constraint failure inside the block.
            conn.execute("INSERT INTO verification_events (id) VALUES (1)")

    assert len(opened) == 1
    assert len(closed) == 1


def test_schema_init_failure_still_closes_connection(monkeypatch, tmp_path):
    """A PRAGMA/DDL failure after connect() must still close the connection."""
    _point_ledger(monkeypatch, tmp_path)
    opened, closed = _track_connections(monkeypatch)

    def fail_schema(conn):
        conn.execute("CREATE TABLE")

    monkeypatch.setattr(ve, "_ensure_schema", fail_schema)

    with pytest.raises(sqlite3.OperationalError, match="incomplete input"):
        with ve._transaction():
            pass

    assert len(opened) == 1
    assert len(closed) == 1
