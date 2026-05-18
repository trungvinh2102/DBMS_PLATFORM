"""
cors.py

CORS origin configuration for browser development and the Tauri desktop shell.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

TAURI_ORIGINS = [
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
]

LOCAL_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
    "http://localhost:1421",
    "http://127.0.0.1:1421",
]


def configure_cors(app: FastAPI) -> None:
    """Attach CORS middleware for local web and desktop runtimes."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=TAURI_ORIGINS + LOCAL_DEV_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Authorization", "X-Conversation-Id"],
    )
