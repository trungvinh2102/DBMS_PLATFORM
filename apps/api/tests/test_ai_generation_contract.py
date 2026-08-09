"""Regression tests for the AI SQL generation route contracts."""

from services.ai_service import ai_service


def test_explain_sql_route_returns_explanation(client, monkeypatch):
    monkeypatch.setattr(
        ai_service,
        "explain_sql",
        lambda *args, **kwargs: {"explanation": "The query scans users."},
    )

    response = client.post("/api/ai/explain-sql", json={"sql": "SELECT * FROM users;"})

    assert response.status_code == 200
    assert response.json == {"explanation": "The query scans users."}


def test_explain_sql_route_places_sql_once_inside_untrusted_delimiter(client, monkeypatch):
    captured = {}

    def fake_generate_response(prompt, **kwargs):
        captured["prompt"] = prompt
        return "TÓM TẮT\n..."

    monkeypatch.setattr(ai_service, "_generate_response", fake_generate_response)

    response = client.post("/api/ai/explain-sql", json={"sql": "SELECT * FROM users;"})

    assert response.status_code == 200
    prompt = captured["prompt"]
    sql_start = prompt.index("<untrusted_sql>")
    sql_end = prompt.index("</untrusted_sql>")
    assert prompt.count("SELECT * FROM users;") == 1
    assert sql_start < prompt.index("SELECT * FROM users;") < sql_end


def test_optimize_sql_route_passes_schema_and_returns_sql_and_result(client, monkeypatch):
    captured = {}

    def fake_optimize_sql(*args, **kwargs):
        captured["args"] = args
        captured["kwargs"] = kwargs
        return {"sql": "SELECT id FROM users;", "result": "optimized"}

    monkeypatch.setattr(ai_service, "optimize_sql", fake_optimize_sql)

    response = client.post(
        "/api/ai/optimize-sql",
        json={
            "sql": "SELECT * FROM users;",
            "databaseId": "db-1",
            "schema_name": "analytics",
        },
    )

    assert response.status_code == 200
    assert response.json == {"sql": "SELECT id FROM users;", "result": "optimized"}
    assert captured["args"][:3] == ("SELECT * FROM users;", "db-1", "analytics")


def test_optimize_sql_requires_database_id(client):
    response = client.post(
        "/api/ai/optimize-sql",
        json={"sql": "SELECT * FROM users;", "schema_name": "analytics"},
    )

    assert response.status_code == 422
    assert any(error["loc"][-1] == "databaseId" for error in response.json["detail"])


def test_explain_sql_service_error_is_http_400(client, monkeypatch):
    monkeypatch.setattr(ai_service, "explain_sql", lambda *args, **kwargs: {"error": "AI unavailable"})

    response = client.post("/api/ai/explain-sql", json={"sql": "SELECT 1;"})

    assert response.status_code == 400
    assert response.json == {"detail": "AI unavailable"}


def test_optimize_sql_service_error_is_http_400(client, monkeypatch):
    monkeypatch.setattr(ai_service, "optimize_sql", lambda *args, **kwargs: {"error": "AI unavailable"})

    response = client.post(
        "/api/ai/optimize-sql",
        json={"sql": "SELECT 1;", "databaseId": "db-1"},
    )

    assert response.status_code == 400
    assert response.json == {"detail": "AI unavailable"}
