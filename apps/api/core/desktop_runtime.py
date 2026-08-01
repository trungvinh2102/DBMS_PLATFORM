"""Desktop-only backend startup configuration helpers."""

from collections.abc import Mapping
from hmac import compare_digest
import os

DESKTOP_PORT_ENV = "QURIODB_DESKTOP_PORT"
DESKTOP_NONCE_ENV = "QURIODB_STARTUP_NONCE"
DEFAULT_PORT = 5000


def resolve_server_port(environ: Mapping[str, str] | None = None) -> int:
    source = os.environ if environ is None else environ
    desktop_value = source.get(DESKTOP_PORT_ENV)
    raw_value = desktop_value if desktop_value is not None else source.get("PORT", str(DEFAULT_PORT))
    try:
        port = int(raw_value)
    except (TypeError, ValueError) as exc:
        name = DESKTOP_PORT_ENV if desktop_value is not None else "PORT"
        raise ValueError(f"{name} must be an integer TCP port") from exc
    if not 1 <= port <= 65535:
        name = DESKTOP_PORT_ENV if desktop_value is not None else "PORT"
        raise ValueError(f"{name} must be between 1 and 65535")
    return port


def resolve_server_host(environ: Mapping[str, str] | None = None) -> str:
    source = os.environ if environ is None else environ
    if source.get(DESKTOP_PORT_ENV) is not None:
        return "127.0.0.1"
    return source.get("HOST", "127.0.0.1")


def configured_startup_nonce(environ: Mapping[str, str] | None = None) -> str | None:
    source = os.environ if environ is None else environ
    value = source.get(DESKTOP_NONCE_ENV, "").strip()
    return value or None


def startup_nonce_matches(provided: str | None, expected: str | None) -> bool:
    if not provided or not expected:
        return False
    return compare_digest(provided, expected)
