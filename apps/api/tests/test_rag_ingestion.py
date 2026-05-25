"""
test_rag_ingestion.py

Regression tests for document and URL ingestion before RAG indexing.
"""

import pytest

from services.ai.retrieval.ingestion import IngestionError, RagIngestionService, extract_html_text


class FakeIndexService:
    def __init__(self):
        self.calls = []

    def index_text_source(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return {"sourceType": args[0], "title": args[1], "content": args[2], "status": "indexed"}


def test_extract_html_text_ignores_script_and_style():
    text = extract_html_text("""
    <html>
      <head><style>.hidden { color: red; }</style></head>
      <body>
        <h1>Orders Manual</h1>
        <script>alert('ignore')</script>
        <p>Use orders.total for revenue.</p>
      </body>
    </html>
    """)

    assert "Orders Manual" in text
    assert "Use orders.total for revenue." in text
    assert "alert" not in text
    assert "hidden" not in text


def test_ingest_file_extracts_markdown_and_delegates_to_index():
    index_service = FakeIndexService()
    service = RagIngestionService(index_service=index_service)

    result = service.ingest_file(
        b"# Refunds\nRefund documents require order_id.",
        "refund-policy.md",
        content_type="text/markdown",
        user_id="user-1",
        database_id="db-1",
        source_id="document:refund-policy",
    )

    args, kwargs = index_service.calls[0]
    assert result["status"] == "indexed"
    assert args[0] == "document"
    assert args[1] == "refund policy"
    assert "Refund documents require order_id." in args[2]
    assert kwargs["database_id"] == "db-1"
    assert kwargs["user_id"] == "user-1"
    assert kwargs["source_id"] == "document:refund-policy"


def test_extract_bytes_rejects_unsupported_file_type():
    service = RagIngestionService(index_service=FakeIndexService())

    with pytest.raises(IngestionError, match="Unsupported ingestion file type"):
        service.extract_bytes(
            b"not a document",
            filename="archive.zip",
            content_type="application/zip",
            title="Archive",
            uri=None,
            source_type="document",
        )


def test_github_blob_url_is_normalized_to_raw_url():
    service = RagIngestionService(index_service=FakeIndexService())

    normalized = service._normalize_url("https://github.com/acme/docs/blob/main/README.md")

    assert normalized == "https://raw.githubusercontent.com/acme/docs/main/README.md"
