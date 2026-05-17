"""
responses.py

Custom FastAPI response classes.
"""

import json
from typing import Any

from fastapi.responses import JSONResponse


class UnicodeJSONResponse(JSONResponse):
    """JSON response that preserves Unicode characters in API payloads."""

    def render(self, content: Any) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")
