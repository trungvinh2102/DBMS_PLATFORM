"""
environment.py

Environment file discovery for source and PyInstaller-packaged backend runs.
"""

import os
import sys

from dotenv import load_dotenv


def load_backend_environment() -> None:
    """Load backend env files before route and service modules are imported."""
    if getattr(sys, "frozen", False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    env_paths = [
        os.path.join(base_path, ".env"),
        os.path.join(base_path, "api.env"),
        os.path.join(base_path, "resources", ".env"),
        os.path.join(base_path, "resources", "api.env"),
        os.path.join(base_path, "_up_", "_up_", "api", ".env"),
        os.path.join(base_path, "..", "_up_", "_up_", "api", ".env"),
        os.path.abspath(".env"),
        os.path.abspath("api.env"),
    ]

    for env_path in env_paths:
        if not os.path.exists(env_path):
            continue

        print(f"Backend: Loading configuration from {env_path}")
        load_dotenv(dotenv_path=env_path, override=True)
        if not os.getenv("DATABASE_URL"):
            os.environ.pop("DATABASE_URL", None)
        return

    os.environ.pop("DATABASE_URL", None)
    load_dotenv()
