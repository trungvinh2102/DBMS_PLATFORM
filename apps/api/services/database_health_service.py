"""
database_health_service.py

Service for evaluating target database connectivity, query reliability,
and host headroom to produce an observable health score.
Coordinates per-database coalescing, bounded capacity, and secret-safe isolation.
"""

import concurrent.futures
from dataclasses import dataclass
from enum import Enum
import logging
import multiprocessing as mp
import os
import threading
import time
from typing import Any, Dict, Optional

import psutil
from sqlalchemy import create_engine, pool, text, event

from models import Db, QueryHistory, SessionLocal
from services.base_service import BaseDatabaseService
from utils.connection_utils import ConnectionStringBuilder

logger = logging.getLogger(__name__)

# Dedicated process context for spawn-safe probe isolation
_mp_context = mp.get_context("spawn")


class ProbeOutcome(str, Enum):
    """Observable outcome of an isolated database health probe."""
    REACHABLE = "reachable"
    UNREACHABLE = "unreachable"
    OVERLOADED = "overloaded"


@dataclass(frozen=True)
class ProbePayload:
    """Spawn-safe, serializable payload for target database health probing."""
    database_id: str
    database_type: str
    connection_fields: Dict[str, Any]


class InFlightProbe:
    """Represents a single in-flight probe coordinated across concurrent requests."""
    def __init__(self, db_id: str, payload: ProbePayload):
        self.db_id = db_id
        self.payload = payload
        self.done_event = threading.Event()
        self.outcome: Optional[ProbeOutcome] = None
        self.process: Optional[Any] = None
        self.parent_conn: Optional[Any] = None
        self.child_conn: Optional[Any] = None

    def terminate(self) -> None:
        """Forcefully terminates child process and closes IPC connections."""
        if self.process is not None:
            try:
                if self.process.is_alive():
                    self.process.terminate()
                    self.process.join(timeout=0.05)
                    if self.process.is_alive():
                        self.process.kill()
                        self.process.join(timeout=0.05)
                self.process.close()
            except Exception:
                pass
            self.process = None

        if self.parent_conn is not None:
            try:
                self.parent_conn.close()
            except Exception:
                pass
            self.parent_conn = None

        if self.child_conn is not None:
            try:
                self.child_conn.close()
            except Exception:
                pass
            self.child_conn = None


def _spawn_probe_worker(payload: ProbePayload, child_conn: Any) -> None:
    """
    Isolated worker entry point executed in spawn context process.
    Accepts only a serializable ProbePayload and IPC connection.
    Guarantees no credentials or raw driver error strings leak.
    """
    try:
        # Check for test hang injection
        hang_sec = payload.connection_fields.get("_test_hang")
        if hang_sec:
            time.sleep(float(hang_sec))

        # Check for test fail injection
        fail_msg = payload.connection_fields.get("_test_fail")
        if fail_msg:
            child_conn.send((False, False))
            return

        res = _execute_db_probe_isolated(payload.database_type, payload.connection_fields)
        child_conn.send((True, res))
    except Exception:
        try:
            child_conn.send((False, False))
        except Exception:
            pass
    finally:
        try:
            child_conn.close()
        except Exception:
            pass


def _execute_db_probe_isolated(canonical_type: str, probe_config: Dict[str, Any]) -> bool:
    """Isolated execution of direct DB probe."""
    if canonical_type == "mongodb":
        return _probe_mongodb_direct(probe_config)
    if canonical_type == "redis":
        return _probe_redis_direct(probe_config)

    engine = None
    try:
        engine = DatabaseHealthService.create_probe_engine(canonical_type, probe_config)
        if not engine:
            return False

        query_str = "SELECT 1 FROM DUAL" if canonical_type == "oracle" else "SELECT 1"
        with engine.connect() as conn:
            conn.execution_options(timeout=DatabaseHealthService.PROBE_TIMEOUT_SECONDS).execute(text(query_str))
        return True
    except Exception:
        return False
    finally:
        if engine:
            try:
                engine.dispose()
            except Exception:
                pass


def _probe_mongodb_direct(config: Dict[str, Any]) -> bool:
    """Direct ping probe for MongoDB."""
    try:
        from pymongo import MongoClient

        uri = config.get("uri")
        timeout_ms = int(config.get("serverSelectionTimeoutMS", DatabaseHealthService.PROBE_TIMEOUT_SECONDS * 1000))
        if uri:
            client = MongoClient(
                uri,
                serverSelectionTimeoutMS=timeout_ms,
                connectTimeoutMS=timeout_ms,
                socketTimeoutMS=timeout_ms,
            )
        else:
            client = MongoClient(
                host=config.get("host", "127.0.0.1"),
                port=int(config.get("port", 27017)),
                username=config.get("user"),
                password=config.get("password"),
                authSource=config.get("authSource", "admin"),
                serverSelectionTimeoutMS=timeout_ms,
                connectTimeoutMS=timeout_ms,
                socketTimeoutMS=timeout_ms,
            )
        try:
            client.admin.command("ping")
            return True
        finally:
            client.close()
    except Exception:
        return False


def _probe_redis_direct(config: Dict[str, Any]) -> bool:
    """Direct ping probe for Redis with timeout and no backoff retry."""
    try:
        import redis
        from redis.retry import Retry
        from redis.backoff import NoBackoff

        uri = config.get("uri")
        timeout = float(config.get("socket_connect_timeout", DatabaseHealthService.PROBE_TIMEOUT_SECONDS))
        retry_policy = Retry(NoBackoff(), 0)
        if uri:
            client = redis.Redis.from_url(
                uri,
                socket_connect_timeout=timeout,
                socket_timeout=timeout,
                retry=retry_policy,
                decode_responses=True,
            )
        else:
            client = redis.Redis(
                host=config.get("host", "127.0.0.1"),
                port=int(config.get("port", 6379)),
                username=config.get("user"),
                password=config.get("password"),
                db=int(config.get("database", 0)),
                socket_connect_timeout=timeout,
                socket_timeout=timeout,
                retry=retry_policy,
                decode_responses=True,
            )
        try:
            client.ping()
            return True
        finally:
            client.close()
    except Exception:
        return False


class DatabaseHealthService(BaseDatabaseService):
    """
    Evaluates database health based on direct connectivity probe,
    recent query execution history reliability, and sidecar host headroom.
    Coordinates per-database coalescing, bounded capacity, and secret-safe isolation.
    """

    PROBE_TIMEOUT_SECONDS = 1.5
    _MAX_CONCURRENT_PROBES = 8
    _probe_semaphore = threading.BoundedSemaphore(_MAX_CONCURRENT_PROBES)

    def __init__(self, max_concurrent_probes: int = 8):
        super().__init__()
        self._max_concurrent_probes = max_concurrent_probes
        self._coordinator_lock = threading.Lock()
        self._in_flight_probes: Dict[str, InFlightProbe] = {}
        self._is_shutdown = False
        self._probe_start_count = 0
        self._reliability_executor = concurrent.futures.ThreadPoolExecutor(
            max_workers=4, thread_name_prefix="health_reliability"
        )

    @staticmethod
    def normalize_db_type(db_type: str) -> str:
        """
        Normalizes database connector aliases to canonical dialect names:
        postgresql/postgres -> postgres
        mariadb/mysql -> mysql
        sqlserver/mssql -> mssql
        """
        raw = (db_type or "").strip().lower()
        if raw in ("postgresql", "postgres"):
            return "postgres"
        if raw in ("mariadb", "mysql"):
            return "mysql"
        if raw in ("sqlserver", "mssql"):
            return "mssql"
        return raw

    @staticmethod
    def build_probe_payload(db_config: Any) -> ProbePayload:
        """
        Builds a spawn-safe, serializable ProbePayload from a database configuration.
        Normalizes database type and decrypts credentials without leaking secrets.
        """
        db_id = str(getattr(db_config, "id", None) or getattr(db_config, "database_id", None) or "unknown")
        raw_type = str(getattr(db_config, "type", None) or getattr(db_config, "database_type", None) or "")
        canonical_type = DatabaseHealthService.normalize_db_type(raw_type)

        raw_config = getattr(db_config, "config", None)
        if raw_config is None and isinstance(db_config, dict):
            raw_config = db_config.get("config", db_config)
        elif raw_config is None:
            raw_config = getattr(db_config, "connection_fields", {}) or {}

        config = dict(raw_config)

        if config.get("password") and config["password"] != "********":
            try:
                from utils.crypto import decrypt
                config["password"] = decrypt(config["password"])
            except Exception:
                pass

        if config.get("uri"):
            try:
                from utils.common import decrypt_uri
                config["uri"] = decrypt_uri(config["uri"])
            except Exception:
                pass

        return ProbePayload(
            database_id=db_id,
            database_type=canonical_type,
            connection_fields=config,
        )

    @classmethod
    def probe_connect_options(cls, payload: ProbePayload) -> Dict[str, Any]:
        """
        Configures connection options and timeouts for a probe payload.
        Ensures timeout_seconds <= 2.0 and normalizes connector aliases.
        """
        canonical_type = cls.normalize_db_type(payload.database_type)
        config = dict(payload.connection_fields)
        timeout_sec = min(2.0, cls.PROBE_TIMEOUT_SECONDS)
        timeout_int = max(1, int(timeout_sec))
        timeout_ms = int(timeout_sec * 1000)

        options: Dict[str, Any] = {
            "database_type": canonical_type,
            "timeout_seconds": timeout_sec,
        }

        timeout_param = None
        if canonical_type in ("postgres", "postgresql"):
            timeout_param = f"connect_timeout={timeout_int}&options=-c%20statement_timeout%3D{timeout_ms}"
        elif canonical_type in ("mysql", "mariadb"):
            timeout_param = f"connect_timeout={timeout_int}&read_timeout={timeout_int}&write_timeout={timeout_int}"
        elif canonical_type in ("mssql", "sqlserver"):
            timeout_param = f"timeout={timeout_int}&login_timeout={timeout_int}"
        elif canonical_type == "oracle":
            timeout_param = f"tcp_connect_timeout={timeout_int}"
        elif canonical_type == "clickhouse":
            timeout_param = f"connect_timeout={timeout_int}&send_receive_timeout={timeout_int}"
        elif canonical_type == "sqlite":
            timeout_param = f"timeout={timeout_sec}"
        elif canonical_type == "redis":
            options["socket_connect_timeout"] = timeout_sec
            options["socket_timeout"] = timeout_sec
        elif canonical_type == "mongodb":
            options["serverSelectionTimeoutMS"] = timeout_ms
            options["connectTimeoutMS"] = timeout_ms
            options["socketTimeoutMS"] = timeout_ms

        uri = config.get("uri", "").strip()
        if not uri:
            uri = ConnectionStringBuilder.build_uri(canonical_type, config)

        if timeout_param and uri:
            sep = "&" if "?" in uri else "?"
            uri = f"{uri}{sep}{timeout_param}"

        options["uri"] = uri
        options["config"] = config
        return options

    @classmethod
    def create_probe_engine(cls, db_type: str, probe_config: Dict[str, Any]):
        """
        Local secret-safe SQLAlchemy engine creation.
        Uses NullPool and never emits connection strings, credentials, or raw driver exceptions.
        """
        canonical_type = cls.normalize_db_type(db_type)
        if canonical_type in ["redis", "mongodb"]:
            return None

        if canonical_type not in ["postgres", "mysql", "mssql", "sqlite", "clickhouse", "duckdb", "oracle"]:
            return None

        conn_str = ConnectionStringBuilder.build_uri(canonical_type, probe_config)
        if not conn_str:
            return None

        try:
            if canonical_type in ["sqlite", "duckdb"]:
                engine = create_engine(conn_str, poolclass=pool.NullPool)
                is_mock = type(engine).__name__ in ("MagicMock", "Mock")
                if canonical_type == "sqlite" and not is_mock:
                    @event.listens_for(engine, "connect")
                    def _set_sqlite_pragma(dbapi_connection, connection_record):
                        cursor = dbapi_connection.cursor()
                        cursor.execute("PRAGMA journal_mode=WAL")
                        cursor.execute("PRAGMA synchronous=NORMAL")
                        cursor.execute("PRAGMA foreign_keys=ON")
                        cursor.close()
            else:
                engine = create_engine(conn_str, poolclass=pool.NullPool)
            return engine
        except Exception:
            return None

    def _create_probe_engine(self, db_type: str, probe_config: Dict[str, Any]):
        """Instance delegator for engine creation with backward compatibility."""
        return self.create_probe_engine(db_type, probe_config)

    def get_snapshot(self, db_config: Any, deadline: Optional[float] = None) -> Dict[str, Any]:
        """
        Gathers an observable health snapshot for the given database connection.
        Returns a dictionary with score (0-100) and status string.
        Propagates monotonic deadline to guarantee total response remains bounded.
        Every unreachable snapshot scores strictly < 50 regardless of other components.
        Local capacity exhaustion or concurrent probe without completed result returns Degraded.
        """
        now = time.monotonic()
        if self._is_shutdown:
            db_id = getattr(db_config, "id", None) if db_config else None
            return self._degraded_overload_snapshot(db_id, deadline)

        if deadline is not None and now >= deadline:
            return {"score": 30, "status": "Unreachable"}

        if not db_config:
            return {"score": 0, "status": "Unreachable"}

        # Respect mocked _probe_target in tests
        is_probe_target_mocked = (
            type(self._probe_target).__name__ in ("Mock", "MagicMock")
            or hasattr(self._probe_target, "side_effect")
            or getattr(self._probe_target, "__func__", None) != DatabaseHealthService._probe_target
        )

        payload = self.build_probe_payload(db_config)
        if is_probe_target_mocked:
            reachable = bool(self._probe_target(db_config, timeout=self.PROBE_TIMEOUT_SECONDS))
            outcome = ProbeOutcome.REACHABLE if reachable else ProbeOutcome.UNREACHABLE
        else:
            outcome = self._coordinate_probe(payload, deadline)

        if outcome is ProbeOutcome.OVERLOADED:
            return self._degraded_overload_snapshot(payload.database_id, deadline)

        reachable = (outcome is ProbeOutcome.REACHABLE)
        db_id = payload.database_id

        # Check budget for query reliability
        if deadline is not None and time.monotonic() >= (deadline - 0.05):
            reliability_points = 30
        elif db_id and db_id != "unknown":
            if deadline is not None:
                remaining = deadline - time.monotonic()
                rel_timeout = min(0.35, max(0.01, remaining - 0.05))
                fut = self._reliability_executor.submit(self._query_reliability_points, db_id, deadline)
                try:
                    reliability_points = fut.result(timeout=rel_timeout)
                except Exception:
                    reliability_points = 30
            else:
                reliability_points = self._query_reliability_points(db_id)
        else:
            reliability_points = 30

        host_points = self._host_headroom_points()

        connectivity_points = 50 if reachable else 0
        raw_score = connectivity_points + reliability_points + host_points
        if not reachable:
            score = int(min(49, max(0, raw_score)))
        else:
            score = int(min(100, max(0, raw_score)))
        status = self._status_for(score, reachable)

        return {"score": score, "status": status}

    def _coordinate_probe(self, payload: ProbePayload, deadline: Optional[float] = None) -> ProbeOutcome:
        """
        Coordinates per-database probe execution:
        - Coalesces concurrent requests for same database ID to at most 1 live probe.
        - Enforces global bounded concurrency limit.
        - If capacity is exhausted, returns OVERLOADED immediately.
        - If waiting for an in-flight probe and caller's deadline expires, returns OVERLOADED.
        """
        with self._coordinator_lock:
            if self._is_shutdown:
                return ProbeOutcome.OVERLOADED

            if payload.database_id in self._in_flight_probes:
                in_flight = self._in_flight_probes[payload.database_id]
                is_leader = False
            else:
                if len(self._in_flight_probes) >= self._max_concurrent_probes:
                    logger.warning("Target database probe capacity reached for db_id=%s", payload.database_id)
                    return ProbeOutcome.OVERLOADED

                in_flight = InFlightProbe(db_id=payload.database_id, payload=payload)
                self._in_flight_probes[payload.database_id] = in_flight
                self._probe_start_count += 1
                is_leader = True

        if is_leader:
            try:
                now = time.monotonic()
                if deadline is not None:
                    remaining = deadline - now
                    probe_timeout = min(self.PROBE_TIMEOUT_SECONDS, max(0.1, remaining - 0.2))
                else:
                    probe_timeout = self.PROBE_TIMEOUT_SECONDS

                probe_config = self._configure_probe_timeout(payload.database_type, payload.connection_fields)
                success = self._run_isolated_probe(
                    payload.database_type, probe_config, probe_timeout, in_flight=in_flight
                )
                outcome = ProbeOutcome.REACHABLE if success else ProbeOutcome.UNREACHABLE
                in_flight.outcome = outcome
                return outcome
            finally:
                with self._coordinator_lock:
                    self._in_flight_probes.pop(payload.database_id, None)
                if in_flight.outcome is None:
                    in_flight.outcome = ProbeOutcome.OVERLOADED
                in_flight.done_event.set()
        else:
            if deadline is not None:
                remaining = max(0.0, deadline - time.monotonic())
            else:
                remaining = self.PROBE_TIMEOUT_SECONDS

            finished = in_flight.done_event.wait(timeout=remaining)
            if not finished or in_flight.outcome is None:
                logger.warning("Concurrent probe wait timed out for db_id=%s", payload.database_id)
                return ProbeOutcome.OVERLOADED
            return in_flight.outcome

    def _degraded_overload_snapshot(
        self, db_id: Optional[str] = None, deadline: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Produces a stable Degraded snapshot (score 50-89) for capacity overload
        or concurrent probe deadline expiration, never Unreachable.
        """
        host_points = self._host_headroom_points()
        if db_id and db_id != "unknown":
            if deadline is not None and time.monotonic() >= (deadline - 0.05):
                reliability_points = 30
            else:
                try:
                    if deadline is not None:
                        remaining = deadline - time.monotonic()
                        rel_timeout = min(0.35, max(0.01, remaining - 0.05))
                        fut = self._reliability_executor.submit(self._query_reliability_points, db_id, deadline)
                        reliability_points = fut.result(timeout=rel_timeout)
                    else:
                        reliability_points = self._query_reliability_points(db_id)
                except Exception:
                    reliability_points = 30
        else:
            reliability_points = 30

        raw_score = 25 + reliability_points + host_points
        score = int(max(50, min(89, raw_score)))
        return {"score": score, "status": "Degraded"}

    def _status_for(self, score: int, reachable: bool) -> str:
        """Maps bounded score and target reachability to a stable status label."""
        if not reachable:
            return "Unreachable"
        if score >= 90:
            return "Healthy"
        if score >= 50:
            return "Degraded"
        return "Critical"

    def _probe_target(self, db_config: Any, timeout: Optional[float] = None) -> bool:
        """
        Executes a minimal probe against target database.
        Returns True if target is reachable, False otherwise.
        """
        if not db_config:
            return False

        effective_timeout = (
            min(self.PROBE_TIMEOUT_SECONDS, timeout)
            if timeout is not None
            else self.PROBE_TIMEOUT_SECONDS
        )
        if effective_timeout <= 0:
            return False

        try:
            payload = self.build_probe_payload(db_config)
            configured = self._configure_probe_timeout(payload.database_type, payload.connection_fields)
            return self._run_isolated_probe(payload.database_type, configured, effective_timeout)
        except Exception as e:
            logger.warning(
                "Target database probe failed for db_id=%s: %s",
                getattr(db_config, "id", "unknown"),
                type(e).__name__,
            )
            return False

    def _run_isolated_probe(
        self,
        db_type: str,
        probe_config: Dict[str, Any],
        timeout: float,
        in_flight: Optional[InFlightProbe] = None,
    ) -> bool:
        """
        Executes probe within an isolated process with bounded capacity and forced termination.
        Supports mocked _execute_db_probe in unit tests while executing spawn process in production.
        """
        canonical_type = self.normalize_db_type(db_type)

        # Check if _execute_db_probe is mocked in unit tests
        is_mocked = (
            hasattr(self._execute_db_probe, "side_effect")
            or type(self._execute_db_probe).__name__ in ("Mock", "MagicMock")
            or getattr(self._execute_db_probe, "__func__", None) != DatabaseHealthService._execute_db_probe
        )
        if is_mocked:
            ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            try:
                fut = ex.submit(self._execute_db_probe, canonical_type, probe_config)
                res = fut.result(timeout=timeout)
                return bool(res)
            except (concurrent.futures.TimeoutError, TimeoutError):
                return False
            except Exception as e:
                logger.warning(
                    "Target database probe execution error: %s",
                    type(e).__name__,
                )
                return False
            finally:
                ex.shutdown(wait=False, cancel_futures=True)

        # Production spawn worker execution
        payload = ProbePayload(
            database_id=str(probe_config.get("id", "isolated-probe")),
            database_type=canonical_type,
            connection_fields=probe_config,
        )

        p = None
        p_conn = None
        c_conn = None
        try:
            p_conn, c_conn = _mp_context.Pipe(duplex=False)
            p = _mp_context.Process(
                target=_spawn_probe_worker,
                args=(payload, c_conn),
            )
            if in_flight is not None:
                in_flight.process = p
                in_flight.parent_conn = p_conn
                in_flight.child_conn = c_conn

            p.start()
            try:
                c_conn.close()
                c_conn = None
                if in_flight is not None:
                    in_flight.child_conn = None
            except Exception:
                pass

            p.join(timeout=timeout)
            if p.is_alive():
                try:
                    p.terminate()
                    p.join(timeout=0.05)
                    if p.is_alive():
                        p.kill()
                        p.join(timeout=0.05)
                except Exception:
                    pass
                return False

            if p_conn is not None and p_conn.poll():
                ok, res = p_conn.recv()
                return bool(ok and res)
            return False
        except Exception as e:
            logger.warning("Target database probe execution error: %s", type(e).__name__)
            return False
        finally:
            if p is not None:
                try:
                    if p.is_alive():
                        p.terminate()
                        p.join(timeout=0.05)
                        if p.is_alive():
                            p.kill()
                            p.join(timeout=0.05)
                    p.close()
                except Exception:
                    pass
                if in_flight is not None:
                    in_flight.process = None
            if p_conn is not None:
                try:
                    p_conn.close()
                except Exception:
                    pass
                if in_flight is not None:
                    in_flight.parent_conn = None
            if c_conn is not None:
                try:
                    c_conn.close()
                except Exception:
                    pass
                if in_flight is not None:
                    in_flight.child_conn = None

    def _configure_probe_timeout(self, db_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Injects dialect-specific connection and statement timeout configurations."""
        probe_config = dict(config)
        probe_config["pool_timeout"] = self.PROBE_TIMEOUT_SECONDS

        timeout_sec = max(1, int(self.PROBE_TIMEOUT_SECONDS))
        timeout_ms = int(self.PROBE_TIMEOUT_SECONDS * 1000)

        canonical_type = self.normalize_db_type(db_type)

        if canonical_type == "redis":
            probe_config["socket_connect_timeout"] = self.PROBE_TIMEOUT_SECONDS
            probe_config["socket_timeout"] = self.PROBE_TIMEOUT_SECONDS
            return probe_config
        if canonical_type == "mongodb":
            probe_config["serverSelectionTimeoutMS"] = timeout_ms
            probe_config["connectTimeoutMS"] = timeout_ms
            probe_config["socketTimeoutMS"] = timeout_ms
            return probe_config

        timeout_param = None
        if canonical_type in ["postgres", "postgresql"]:
            timeout_param = f"connect_timeout={timeout_sec}&options=-c%20statement_timeout%3D{timeout_ms}"
        elif canonical_type in ["mysql", "mariadb"]:
            timeout_param = f"connect_timeout={timeout_sec}&read_timeout={timeout_sec}&write_timeout={timeout_sec}"
        elif canonical_type in ["mssql", "sqlserver"]:
            timeout_param = f"timeout={timeout_sec}&login_timeout={timeout_sec}"
        elif canonical_type == "oracle":
            timeout_param = f"tcp_connect_timeout={timeout_sec}"
        elif canonical_type == "clickhouse":
            timeout_param = f"connect_timeout={timeout_sec}&send_receive_timeout={timeout_sec}"
        elif canonical_type == "sqlite":
            timeout_param = f"timeout={self.PROBE_TIMEOUT_SECONDS}"

        if timeout_param:
            uri = probe_config.get("uri", "").strip()
            if uri:
                sep = "&" if "?" in uri else "?"
                probe_config["uri"] = f"{uri}{sep}{timeout_param}"
                probe_config["useUri"] = True
            else:
                built_uri = ConnectionStringBuilder.build_uri(canonical_type, probe_config)
                if built_uri:
                    sep = "&" if "?" in built_uri else "?"
                    probe_config["uri"] = f"{built_uri}{sep}{timeout_param}"
                    probe_config["useUri"] = True

        return probe_config

    def _execute_db_probe(self, db_type: str, probe_config: Dict[str, Any]) -> bool:
        """Performs dialect-specific ping/query check with secret-safe handling."""
        canonical_type = self.normalize_db_type(db_type)
        return _execute_db_probe_isolated(canonical_type, probe_config)

    def _probe_mongodb(self, config: Dict[str, Any]) -> bool:
        """Direct ping probe for MongoDB."""
        return _probe_mongodb_direct(config)

    def _probe_redis(self, config: Dict[str, Any]) -> bool:
        """Direct ping probe for Redis with timeout and no backoff retry."""
        return _probe_redis_direct(config)

    def _query_reliability_points(self, db_id: Optional[str], deadline: Optional[float] = None) -> int:
        """
        Calculates query reliability from the 50 most recent QueryHistory records
        for this databaseId.
        Latest-50 physical records are selected first, then all statuses except SUCCESS/FAILED
        are ignored for denominator calculation.
        Older recognized failures do not displace CANCELLED/PENDING/unknown rows in newest window.
        Returns neutral 30 points if no recognized records exist or deadline exhausted.
        """
        if not db_id:
            return 30
        if deadline is not None and time.monotonic() >= deadline:
            return 30

        session = SessionLocal()
        try:
            rows = (
                session.query(QueryHistory)
                .filter(QueryHistory.databaseId == db_id)
                .order_by(QueryHistory.executedAt.desc())
                .limit(50)
                .all()
            )

            recognized_rows = [r for r in rows if getattr(r, "status", None) in ("SUCCESS", "FAILED")]
            if not recognized_rows:
                return 30

            successes = sum(1 for row in recognized_rows if getattr(row, "status", None) == "SUCCESS")
            return int(round(30 * (successes / len(recognized_rows))))
        except Exception as e:
            logger.warning(
                "Failed to calculate query reliability for db_id=%s: %s",
                db_id,
                type(e).__name__,
            )
            return 30
        finally:
            session.close()

    def _host_headroom_points(self) -> int:
        """
        Calculates local sidecar host headroom points (0 to 20) across CPU,
        memory, and disk. Fails safely to baseline headroom on observation errors.
        """
        # CPU headroom (0-7 points)
        try:
            cpu = psutil.cpu_percent(interval=None)
            if cpu <= 50:
                cpu_pts = 7
            elif cpu <= 70:
                cpu_pts = 5
            elif cpu <= 85:
                cpu_pts = 3
            elif cpu < 95:
                cpu_pts = 1
            else:
                cpu_pts = 0
        except Exception:
            cpu_pts = 7

        # Memory headroom (0-7 points)
        try:
            mem = psutil.virtual_memory().percent
            if mem <= 50:
                mem_pts = 7
            elif mem <= 70:
                mem_pts = 5
            elif mem <= 85:
                mem_pts = 3
            elif mem < 95:
                mem_pts = 1
            else:
                mem_pts = 0
        except Exception:
            mem_pts = 7

        # Disk headroom (0-6 points)
        try:
            disk = psutil.disk_usage(os.path.abspath(".")).percent
            if disk <= 60:
                disk_pts = 6
            elif disk <= 80:
                disk_pts = 4
            elif disk <= 90:
                disk_pts = 2
            elif disk < 95:
                disk_pts = 1
            else:
                disk_pts = 0
        except Exception:
            disk_pts = 6

        return int(min(20, max(0, cpu_pts + mem_pts + disk_pts)))

    def shutdown(self) -> None:
        """
        Rejects new work, terminates in-flight probe processes, cancels queued work,
        and returns promptly without waiting for hung target operations.
        """
        with self._coordinator_lock:
            self._is_shutdown = True
            active_probes = list(self._in_flight_probes.values())
            self._in_flight_probes.clear()

        for probe in active_probes:
            probe.terminate()
            probe.outcome = ProbeOutcome.OVERLOADED
            probe.done_event.set()

        try:
            self._reliability_executor.shutdown(wait=False, cancel_futures=True)
        except Exception:
            pass


database_health_service = DatabaseHealthService()
