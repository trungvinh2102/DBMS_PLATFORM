"""
test_ai_explain_plan.py

Regression tests for AI execution plan explanations.
"""

from services.ai.sql import SqlAIService


def test_explain_execution_plan_uses_normalized_graph(monkeypatch):
    """AI plan explanation should include graph nodes and route through sql.explain."""
    service = SqlAIService()
    captured = {}

    def fake_generate_response(prompt, **kwargs):
        captured["prompt"] = prompt
        captured["kwargs"] = kwargs
        return "Tóm tắt: truy vấn đang scan bảng users."

    monkeypatch.setattr(service, "_generate_response", fake_generate_response)
    monkeypatch.setattr(service, "_save_chat", lambda *args, **kwargs: None)

    result = service.explain_execution_plan(
        sql="SELECT * FROM users",
        dialect="postgresql",
        plan={"Plan": {"Node Type": "Seq Scan"}},
        graph={"nodes": [{"operation": "Seq Scan", "relation": "users", "warnings": ["Full scan"]}]},
        summary={"warningCount": 1},
        user_id="user-1",
        db_id="db-1",
    )

    assert result["explanation"].startswith("Tóm tắt")
    assert "Seq Scan" in captured["prompt"]
    assert captured["kwargs"]["task_key"] == "sql.explain"
    assert captured["kwargs"]["db_id"] == "db-1"
