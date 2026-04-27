from __future__ import annotations

import contextvars
import logging
import time
from typing import Any

from sqlalchemy import event
from sqlalchemy.engine import Engine

from core.config import settings

logger = logging.getLogger("carcare.db")

_request_meta: contextvars.ContextVar[dict[str, Any] | None] = contextvars.ContextVar("request_meta", default=None)
_query_stats: contextvars.ContextVar[dict[str, float | int] | None] = contextvars.ContextVar("query_stats", default=None)


def begin_request(path: str) -> None:
    if not settings.DB_TIMING_LOG_ENABLED:
        return
    _request_meta.set({"path": path, "started_at": time.perf_counter()})
    _query_stats.set({"count": 0, "db_ms": 0.0})


def end_request(status_code: int) -> None:
    if not settings.DB_TIMING_LOG_ENABLED:
        return
    meta = _request_meta.get()
    stats = _query_stats.get()
    if not meta or not stats:
        return
    total_ms = (time.perf_counter() - meta["started_at"]) * 1000
    logger.info(
        "request_timing path=%s status=%s total_ms=%.1f db_ms=%.1f query_count=%s",
        meta["path"],
        status_code,
        total_ms,
        stats["db_ms"],
        stats["count"],
    )
    _request_meta.set(None)
    _query_stats.set(None)


def setup_db_timing_logging(engine: Engine) -> None:
    if not settings.DB_TIMING_LOG_ENABLED:
        return

    @event.listens_for(engine, "before_cursor_execute")
    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):  # type: ignore[no-untyped-def]
        conn.info.setdefault("query_started_at", []).append(time.perf_counter())

    @event.listens_for(engine, "after_cursor_execute")
    def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):  # type: ignore[no-untyped-def]
        started_stack = conn.info.get("query_started_at") or []
        started_at = started_stack.pop() if started_stack else None
        if started_at is None:
            return
        stats = _query_stats.get()
        if not stats:
            return
        stats["count"] = int(stats["count"]) + 1
        stats["db_ms"] = float(stats["db_ms"]) + ((time.perf_counter() - started_at) * 1000)
        _query_stats.set(stats)
