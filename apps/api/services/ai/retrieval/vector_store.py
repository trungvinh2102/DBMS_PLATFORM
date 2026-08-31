"""
vector_store.py

Vector backend configuration facade for desktop-safe and enterprise RAG modes.
"""

import os
from dataclasses import dataclass
from typing import Dict


SUPPORTED_VECTOR_BACKENDS = {"sqlite_vec"}


@dataclass(frozen=True)
class VectorStoreConfig:
    """Resolved vector backend settings without exposing credentials."""

    backend: str
    enabled: bool
    requires_external_service: bool

    def to_status(self) -> Dict[str, object]:
        return {
            "backend": self.backend,
            "enabled": self.enabled,
            "requiresExternalService": self.requires_external_service,
            "supportedBackends": sorted(SUPPORTED_VECTOR_BACKENDS),
        }


def resolve_vector_store_config() -> VectorStoreConfig:
    """Resolves the configured vector backend defaulting to sqlite_vec."""
    backend = os.getenv("QURIODB_RAG_VECTOR_BACKEND", "sqlite_vec").strip().lower()
    if backend not in SUPPORTED_VECTOR_BACKENDS:
        backend = "sqlite_vec"
    return VectorStoreConfig(
        backend=backend,
        enabled=os.getenv("QURIODB_RAG_ENABLED", "true").lower() not in {"0", "false", "no"},
        requires_external_service=False,
    )
