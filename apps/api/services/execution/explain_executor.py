"""
explain_executor.py

Specialized executor for relational SQL EXPLAIN plans via SQLAlchemy.
"""

import logging
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import text

logger = logging.getLogger(__name__)

class ExplainExecutor:
    """Handles execution of EXPLAIN plans across diverse relational dialects via SQLAlchemy."""

    def __init__(self, service):
        self.service = service

    def execute(self, db_id: str, sql: str) -> Dict[str, Any]:
        """Wraps SQLAlchemy's execute call with dialect-specific logic for EXPLAIN formatting."""
        def _op(conn):
            dialect = conn.engine.dialect.name
            
            explain_sql = sql.strip()
            if explain_sql.endswith(';'):
                explain_sql = explain_sql[:-1]

            # Dialect-specific EXPLAIN syntax
            if dialect == 'postgresql':
                explain_sql = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {explain_sql}"
            elif dialect in ['mysql', 'mariadb']:
                explain_sql = f"EXPLAIN FORMAT=JSON {explain_sql}"
            elif dialect == 'sqlite':
                explain_sql = f"EXPLAIN QUERY PLAN {explain_sql}"
            elif dialect == 'duckdb':
                explain_sql = f"EXPLAIN ANALYZE {explain_sql}"
            elif dialect == 'oracle':
                # Oracle uses a two-step EXPLAIN PLAN approach
                conn.execute(text(f"EXPLAIN PLAN FOR {explain_sql}"))
                result = conn.execute(text(
                    "SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY('PLAN_TABLE', NULL, 'TYPICAL'))"
                ))
                plan_lines = [str(row[0]) for row in result]
                return self._response("\n".join(plan_lines), dialect)
            else:
                explain_sql = f"EXPLAIN {explain_sql}"

            if dialect == 'postgresql':
                conn.execute(text("SET statement_timeout = '30s'"))

            result = conn.execute(text(explain_sql))
            
            # Extract JSON plan and dialect metadata
            if result.returns_rows:
                rows = [row for row in result]
                if dialect in ['postgresql', 'mysql'] and rows:
                    if dialect == 'postgresql':
                        # Postgres drivers may return JSON as either a Python object or a JSON string.
                        return self._response(self._parse_json_plan(rows[0][0]), dialect)
                    if dialect == 'mysql':
                        # MySQL EXPLAIN FORMAT=JSON returns a string representation of a JSON object at rows[0][0]
                        try:
                            return self._response(self._parse_json_plan(rows[0][0]), dialect)
                        except Exception as e:
                            logger.error(f"Failed to parse MySQL JSON EXPLAIN plan: {e}")
                
                # SQLite EXPLAIN QUERY PLAN returns (id, parent, notused, detail)
                if dialect == 'sqlite' and rows:
                    tree_nodes = []
                    for row in rows:
                        tree_nodes.append({
                            "id": row[0],
                            "parent": row[1],
                            "detail": row[3] if len(row) > 3 else str(row[2]) if len(row) > 2 else str(row)
                        })
                    return self._response(tree_nodes, dialect)
                
                # DuckDB EXPLAIN ANALYZE returns a text-based plan
                if dialect == 'duckdb' and rows:
                    # DuckDB returns a single column with the explain text
                    plan_lines = []
                    for row in rows:
                        line = str(row[0]) if row else ""
                        plan_lines.append(line)
                    return self._response("\n".join(plan_lines), dialect)
                
                # Fallback for plain text EXPLAIN
                keys = list(result.keys())
                data = [dict(zip(keys, row)) for row in rows]
                return self._response(data, dialect)
                
            return self._response(None, dialect)
                
        return self.service.run_dynamic_query(db_id, _op)

    def _response(self, plan: Any, dialect: str) -> Dict[str, Any]:
        graph = self._build_graph(plan, dialect)
        return {
            "plan": plan,
            "dialect": dialect,
            "graph": graph,
            "summary": self._summarize_graph(graph),
        }

    def _parse_json_plan(self, value: Any) -> Any:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                logger.warning("EXPLAIN returned non-JSON text for a JSON plan request.")
        return value

    def _build_graph(self, plan: Any, dialect: str) -> Dict[str, List[Dict[str, Any]]]:
        if dialect == "postgresql":
            postgres_plan = self._postgres_root(plan)
            if postgres_plan:
                return self._postgres_graph(postgres_plan)
        if dialect == "sqlite" and isinstance(plan, list):
            return self._sqlite_graph(plan)
        if dialect in {"mysql", "mariadb"} and isinstance(plan, dict):
            return self._mysql_graph(plan)
        if isinstance(plan, str):
            return self._text_graph(plan)
        return self._generic_graph(plan)

    def _postgres_root(self, plan: Any) -> Optional[Dict[str, Any]]:
        if isinstance(plan, list) and plan:
            first = plan[0]
            if isinstance(first, dict):
                return first.get("Plan") or first
        if isinstance(plan, dict):
            return plan.get("Plan") or plan
        return None

    def _postgres_graph(self, root: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        def visit(node: Dict[str, Any], parent_id: Optional[str] = None, index: int = 0) -> None:
            node_id = f"pg-{len(nodes) + 1}"
            operation = str(node.get("Node Type") or "Plan Node")
            relation = node.get("Relation Name")
            details = {
                "startupCost": node.get("Startup Cost"),
                "totalCost": node.get("Total Cost"),
                "planRows": node.get("Plan Rows"),
                "actualRows": node.get("Actual Rows"),
                "actualTotalTime": node.get("Actual Total Time"),
                "filter": node.get("Filter"),
                "indexCond": node.get("Index Cond"),
                "joinType": node.get("Join Type"),
            }
            warnings = self._warnings(operation, relation, details)
            nodes.append({
                "id": node_id,
                "label": relation or operation,
                "operation": operation,
                "relation": relation,
                "details": {key: value for key, value in details.items() if value is not None},
                "warnings": warnings,
            })
            if parent_id:
                edges.append({"id": f"{parent_id}-{node_id}", "source": parent_id, "target": node_id, "label": f"child {index + 1}"})
            for child_index, child in enumerate(node.get("Plans") or []):
                if isinstance(child, dict):
                    visit(child, node_id, child_index)

        visit(root)
        return {"nodes": nodes, "edges": edges}

    def _sqlite_graph(self, plan: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        nodes = []
        edges = []
        ids = {str(item.get("id")) for item in plan}
        for item in plan:
            node_id = f"sqlite-{item.get('id')}"
            detail = str(item.get("detail") or "Query plan step")
            operation = self._operation_from_detail(detail)
            nodes.append({
                "id": node_id,
                "label": detail,
                "operation": operation,
                "relation": self._relation_from_detail(detail),
                "details": {"detail": detail, "parent": item.get("parent")},
                "warnings": self._warnings(operation, None, {"detail": detail}),
            })
            parent = str(item.get("parent"))
            if parent in ids and parent != "0":
                edges.append({"id": f"sqlite-{parent}-{node_id}", "source": f"sqlite-{parent}", "target": node_id})
        return {"nodes": nodes, "edges": edges}

    def _mysql_graph(self, plan: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []

        def visit(value: Any, parent_id: Optional[str] = None, label: str = "query") -> None:
            if not isinstance(value, dict):
                return
            table = value.get("table") if isinstance(value.get("table"), dict) else value
            relation = table.get("table_name") or table.get("access_type") or label
            operation = str(table.get("access_type") or value.get("select_id") or label).upper()
            node_id = f"mysql-{len(nodes) + 1}"
            details = {
                "rowsExaminedPerScan": table.get("rows_examined_per_scan"),
                "rowsProducedPerJoin": table.get("rows_produced_per_join"),
                "filtered": table.get("filtered"),
                "costInfo": table.get("cost_info"),
                "attachedCondition": table.get("attached_condition"),
                "usedKeyParts": table.get("used_key_parts"),
            }
            nodes.append({
                "id": node_id,
                "label": str(relation),
                "operation": operation,
                "relation": table.get("table_name"),
                "details": {key: item for key, item in details.items() if item is not None},
                "warnings": self._warnings(operation, table.get("table_name"), details),
            })
            if parent_id:
                edges.append({"id": f"{parent_id}-{node_id}", "source": parent_id, "target": node_id, "label": label})
            for key, child in value.items():
                if isinstance(child, dict):
                    visit(child, node_id, key)
                elif isinstance(child, list):
                    for item in child:
                        visit(item, node_id, key)

        visit(plan.get("query_block", plan))
        return {"nodes": nodes, "edges": edges}

    def _text_graph(self, plan: str) -> Dict[str, List[Dict[str, Any]]]:
        nodes = []
        edges = []
        for line in [line.strip() for line in plan.splitlines() if line.strip()]:
            upper = line.upper()
            if not any(token in upper for token in ["SCAN", "JOIN", "FILTER", "SORT", "AGGREGATE", "PROJECTION", "EXPLAIN", "PLAN"]):
                continue
            node_id = f"text-{len(nodes) + 1}"
            operation = self._operation_from_detail(line)
            nodes.append({
                "id": node_id,
                "label": line[:120],
                "operation": operation,
                "relation": self._relation_from_detail(line),
                "details": {"detail": line},
                "warnings": self._warnings(operation, None, {"detail": line}),
            })
            if len(nodes) > 1:
                edges.append({"id": f"text-{len(nodes) - 1}-{len(nodes)}", "source": f"text-{len(nodes) - 1}", "target": node_id})
        return {"nodes": nodes, "edges": edges}

    def _generic_graph(self, plan: Any) -> Dict[str, List[Dict[str, Any]]]:
        if not plan:
            return {"nodes": [], "edges": []}
        return {
            "nodes": [{
                "id": "plan-1",
                "label": "Execution Plan",
                "operation": "Plan",
                "relation": None,
                "details": {"rawType": type(plan).__name__},
                "warnings": [],
            }],
            "edges": [],
        }

    def _summarize_graph(self, graph: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        nodes = graph.get("nodes", [])
        warning_nodes = [node for node in nodes if node.get("warnings")]
        operations: Dict[str, int] = {}
        for node in nodes:
            operation = str(node.get("operation") or "Unknown")
            operations[operation] = operations.get(operation, 0) + 1
        return {
            "nodeCount": len(nodes),
            "edgeCount": len(graph.get("edges", [])),
            "warningCount": len(warning_nodes),
            "operations": operations,
            "warnings": [
                {"nodeId": node.get("id"), "label": node.get("label"), "warnings": node.get("warnings")}
                for node in warning_nodes[:8]
            ],
        }

    def _warnings(self, operation: str, relation: Optional[str], details: Dict[str, Any]) -> List[str]:
        text = f"{operation} {relation or ''} {details.get('detail') or ''}".upper()
        warnings: List[str] = []
        if "SEQ SCAN" in text or ("SCAN" in text and "INDEX" not in text and "SEARCH" not in text):
            warnings.append("Full scan")
        if "NESTED LOOP" in text:
            warnings.append("Nested loop join")
        if details.get("actualTotalTime") and float(details["actualTotalTime"]) > 50:
            warnings.append("Slow node")
        if details.get("totalCost") and float(details["totalCost"]) > 1000:
            warnings.append("High cost")
        if details.get("rowsExaminedPerScan") and int(details["rowsExaminedPerScan"]) > 10000:
            warnings.append("Many rows examined")
        return warnings

    def _operation_from_detail(self, detail: str) -> str:
        upper = detail.upper()
        for token in ["HASH_JOIN", "NESTED_LOOP", "INDEX", "SEARCH", "SCAN", "FILTER", "SORT", "AGGREGATE", "PROJECTION"]:
            if token in upper:
                return token.replace("_", " ").title()
        return "Plan Step"

    def _relation_from_detail(self, detail: str) -> Optional[str]:
        tokens = detail.replace("`", "").replace('"', "").split()
        for marker in ["TABLE", "ON", "FROM"]:
            if marker in [token.upper() for token in tokens]:
                index = [token.upper() for token in tokens].index(marker)
                if index + 1 < len(tokens):
                    return tokens[index + 1].strip("(),")
        return None
