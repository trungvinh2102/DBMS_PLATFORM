"""
router_terms.py

Configurable lexical routing terms for QurioDB's AI behavior router.
"""

import datetime
import re
import unicodedata
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from models import AIRouterTerm, AIRouterTermSet, SessionLocal


ROUTER_TERM_SET_CONFIG: Dict[str, Dict[str, Any]] = {
    "exploration_terms": {
        "behavior": "data_exploration",
        "intent": "text_to_sql",
        "ragMode": "deep",
        "reasoningMode": "deep",
        "defaultWeight": 1.0,
        "terms": [
            "analyze", "analysis", "insight", "trend", "compare", "comparison", "cohort",
            "segment", "ranking", "top", "highest", "lowest", "most", "least", "why",
            "cause", "anomaly", "outlier", "metric", "revenue", "sales", "growth",
            "churn", "retention", "conversion", "booking", "order", "customer",
            "phan tich", "xu huong", "so sanh", "bat thuong", "nguyen nhan",
            "doanh thu", "tang truong", "giam", "cao nhat", "thap nhat", "nhieu nhat",
            "it nhat", "khach hang", "nguoi dung", "don hang", "luot dat", "hieu qua",
            "nhay cam",
        ],
    },
    "metric_terms": {
        "behavior": "data_exploration",
        "intent": "text_to_sql",
        "ragMode": "deep",
        "reasoningMode": "deep",
        "defaultWeight": 0.8,
        "terms": [
            "revenue", "sales", "growth", "churn", "retention", "conversion", "metric",
            "total", "average", "sum", "count", "doanh thu", "tang truong", "ti le",
            "tong", "trung binh", "so luong",
        ],
    },
    "sql_coding_terms": {
        "behavior": "sql_coding",
        "intent": "text_to_sql",
        "ragMode": "shallow",
        "reasoningMode": "normal",
        "defaultWeight": 1.0,
        "terms": [
            "sql", "query", "select", "write", "generate", "create", "fix", "repair",
            "optimize", "explain", "syntax", "truy van", "viet", "tao", "sua", "toi uu",
            "giai thich",
        ],
    },
    "schema_terms": {
        "behavior": "schema_lookup",
        "intent": "schema_question",
        "ragMode": "shallow",
        "reasoningMode": "normal",
        "defaultWeight": 1.0,
        "terms": [
            "schema", "table", "tables", "column", "columns", "relationship", "foreign key",
            "primary key", "index", "ddl", "luoc do", "bang", "cot", "khoa ngoai",
            "khoa chinh",
        ],
    },
    "document_terms": {
        "behavior": "document_lookup",
        "intent": "document_question",
        "ragMode": "shallow",
        "reasoningMode": "normal",
        "defaultWeight": 1.0,
        "terms": [
            "document", "manual", "file", "uploaded", "knowledge", "doc", "tai lieu",
            "tep", "file tai len",
        ],
    },
}


@dataclass(frozen=True)
class RouterTerm:
    term: str
    normalized_term: str
    match_type: str
    weight: float
    is_negative: bool


class RouterTermService:
    """Loads router terms from metadata DB with deterministic defaults as fallback."""

    def __init__(self):
        self._cache: Dict[str, Any] = {"expires_at": None, "terms": None}

    def seed_defaults(self, session) -> None:
        """Create built-in router term sets without overwriting user-edited rows."""
        now = datetime.datetime.now(datetime.UTC)
        for key, config in ROUTER_TERM_SET_CONFIG.items():
            set_id = self._term_set_id(key)
            term_set = session.get(AIRouterTermSet, set_id)
            if not term_set:
                term_set = AIRouterTermSet(
                    id=set_id,
                    key=key,
                    behavior=config["behavior"],
                    intent=config["intent"],
                    ragMode=config["ragMode"],
                    reasoningMode=config["reasoningMode"],
                    defaultWeight=float(config.get("defaultWeight", 1.0)),
                    enabled=True,
                    systemDefined=True,
                )
                session.add(term_set)
            else:
                term_set.behavior = config["behavior"]
                term_set.intent = config["intent"]
                term_set.ragMode = config["ragMode"]
                term_set.reasoningMode = config["reasoningMode"]
                term_set.defaultWeight = float(config.get("defaultWeight", 1.0))

            for term in config["terms"]:
                normalized = normalize_router_text(term)
                term_id = self._term_id(key, normalized, "phrase")
                if session.get(AIRouterTerm, term_id):
                    continue
                session.add(AIRouterTerm(
                    id=term_id,
                    termSetId=set_id,
                    term=term,
                    normalizedTerm=normalized,
                    language="any",
                    matchType="phrase",
                    weight=float(config.get("defaultWeight", 1.0)),
                    isNegative=False,
                    enabled=True,
                    created_on=now,
                    changed_on=now,
                ))

        self.clear_cache()

    def list_term_sets(self) -> List[Dict[str, Any]]:
        session = SessionLocal()
        if not session:
            return self._default_term_set_payloads()

        try:
            term_sets = session.query(AIRouterTermSet).order_by(AIRouterTermSet.key.asc()).all()
            if not term_sets:
                return self._default_term_set_payloads()

            terms_by_set: Dict[str, List[AIRouterTerm]] = {}
            terms = session.query(AIRouterTerm).order_by(AIRouterTerm.normalizedTerm.asc()).all()
            for term in terms:
                terms_by_set.setdefault(term.termSetId, []).append(term)

            return [
                self._term_set_to_dict(term_set, terms_by_set.get(term_set.id, []))
                for term_set in term_sets
            ]
        except Exception:
            return self._default_term_set_payloads()
        finally:
            session.close()

    def create_term(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        term_set_key = str(payload.get("termSetKey") or "").strip()
        raw_term = str(payload.get("term") or "").strip()
        if not term_set_key:
            raise ValueError("termSetKey is required")
        if not raw_term:
            raise ValueError("term is required")

        session = SessionLocal()
        if not session:
            raise ValueError("metadata database is unavailable")

        try:
            term_set = self._ensure_term_set(session, term_set_key)
            normalized = normalize_router_text(raw_term)
            match_type = str(payload.get("matchType") or "phrase").strip() or "phrase"
            existing = (
                session.query(AIRouterTerm)
                .filter(
                    AIRouterTerm.termSetId == term_set.id,
                    AIRouterTerm.normalizedTerm == normalized,
                    AIRouterTerm.matchType == match_type,
                )
                .first()
            )
            if existing:
                raise ValueError("Router term already exists in this set")

            term = AIRouterTerm(
                id=str(uuid.uuid4()),
                termSetId=term_set.id,
                term=raw_term,
                normalizedTerm=normalized,
                language=str(payload.get("language") or "any").strip() or "any",
                matchType=match_type,
                weight=float(payload.get("weight") if payload.get("weight") is not None else term_set.defaultWeight or 1.0),
                isNegative=bool(payload.get("isNegative", False)),
                enabled=bool(payload.get("enabled", True)),
                notes=str(payload.get("notes") or "").strip() or None,
            )
            session.add(term)
            session.commit()
            self.clear_cache()
            return self._term_to_dict(term, term_set)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def update_term(self, term_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        session = SessionLocal()
        if not session:
            raise ValueError("metadata database is unavailable")

        try:
            term = session.get(AIRouterTerm, term_id)
            if not term:
                raise ValueError("Router term not found")
            term_set = session.get(AIRouterTermSet, term.termSetId)
            if not term_set:
                raise ValueError("Router term set not found")

            if "term" in payload and payload.get("term") is not None:
                raw_term = str(payload["term"]).strip()
                if not raw_term:
                    raise ValueError("term cannot be empty")
                term.term = raw_term
                term.normalizedTerm = normalize_router_text(raw_term)
            if "language" in payload:
                term.language = str(payload.get("language") or "any").strip() or "any"
            if "matchType" in payload:
                term.matchType = str(payload.get("matchType") or "phrase").strip() or "phrase"
            if "weight" in payload and payload.get("weight") is not None:
                term.weight = float(payload["weight"])
            if "isNegative" in payload:
                term.isNegative = bool(payload["isNegative"])
            if "enabled" in payload:
                term.enabled = bool(payload["enabled"])
            if "notes" in payload:
                term.notes = str(payload.get("notes") or "").strip() or None

            session.commit()
            self.clear_cache()
            return self._term_to_dict(term, term_set)
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def delete_term(self, term_id: str) -> Dict[str, Any]:
        session = SessionLocal()
        if not session:
            raise ValueError("metadata database is unavailable")

        try:
            term = session.get(AIRouterTerm, term_id)
            if not term:
                raise ValueError("Router term not found")
            term_set = session.get(AIRouterTermSet, term.termSetId)
            if term_set and self._is_system_term(term_set, term):
                term.enabled = False
                result = {"deleted": False, "disabled": True, "id": term_id}
            else:
                session.delete(term)
                result = {"deleted": True, "disabled": False, "id": term_id}
            session.commit()
            self.clear_cache()
            return result
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def any_match(self, normalized_text: str, key: str) -> bool:
        return self.score(normalized_text, key) > 0

    def score(self, normalized_text: str, key: str) -> float:
        score = 0.0
        for term in self.get_terms_by_key().get(key, []):
            if not self._matches(normalized_text, term):
                continue
            score += -term.weight if term.is_negative else term.weight
        return score

    def get_terms_by_key(self) -> Dict[str, List[RouterTerm]]:
        cache_terms = self._cache.get("terms")
        expires_at = self._cache.get("expires_at")
        if cache_terms is not None and expires_at and expires_at > datetime.datetime.now(datetime.UTC):
            return cache_terms

        terms = self._load_terms_from_db()
        self._cache = {
            "terms": terms,
            "expires_at": datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=30),
        }
        return terms

    def clear_cache(self) -> None:
        self._cache = {"expires_at": None, "terms": None}

    def _load_terms_from_db(self) -> Dict[str, List[RouterTerm]]:
        session = SessionLocal()
        if not session:
            return self._default_terms_by_key()

        try:
            rows = (
                session.query(AIRouterTermSet, AIRouterTerm)
                .join(AIRouterTerm, AIRouterTerm.termSetId == AIRouterTermSet.id)
                .filter(AIRouterTermSet.enabled.is_(True), AIRouterTerm.enabled.is_(True))
                .all()
            )
            if not rows:
                return self._default_terms_by_key()

            terms_by_key: Dict[str, List[RouterTerm]] = {}
            for term_set, term in rows:
                terms_by_key.setdefault(term_set.key, []).append(RouterTerm(
                    term=term.term,
                    normalized_term=term.normalizedTerm,
                    match_type=term.matchType or "phrase",
                    weight=float(term.weight or term_set.defaultWeight or 1.0),
                    is_negative=bool(term.isNegative),
                ))
            return terms_by_key
        except Exception:
            return self._default_terms_by_key()
        finally:
            session.close()

    def _ensure_term_set(self, session, key: str):
        term_set = session.query(AIRouterTermSet).filter(AIRouterTermSet.key == key).first()
        if term_set:
            return term_set

        config = ROUTER_TERM_SET_CONFIG.get(key)
        if not config:
            raise ValueError(f"Unsupported router term set: {key}")

        term_set = AIRouterTermSet(
            id=self._term_set_id(key),
            key=key,
            behavior=config["behavior"],
            intent=config["intent"],
            ragMode=config["ragMode"],
            reasoningMode=config["reasoningMode"],
            defaultWeight=float(config.get("defaultWeight", 1.0)),
            enabled=True,
            systemDefined=True,
        )
        session.add(term_set)
        session.flush()
        return term_set

    def _term_set_to_dict(self, term_set: AIRouterTermSet, terms: List[AIRouterTerm]) -> Dict[str, Any]:
        return {
            "id": term_set.id,
            "key": term_set.key,
            "behavior": term_set.behavior,
            "intent": term_set.intent,
            "ragMode": term_set.ragMode,
            "reasoningMode": term_set.reasoningMode,
            "defaultWeight": term_set.defaultWeight,
            "enabled": bool(term_set.enabled),
            "systemDefined": bool(term_set.systemDefined),
            "databaseId": term_set.databaseId,
            "userId": term_set.userId,
            "terms": [self._term_to_dict(term, term_set) for term in terms],
        }

    def _term_to_dict(self, term: AIRouterTerm, term_set: Optional[AIRouterTermSet] = None) -> Dict[str, Any]:
        return {
            "id": term.id,
            "termSetId": term.termSetId,
            "termSetKey": term_set.key if term_set else None,
            "term": term.term,
            "normalizedTerm": term.normalizedTerm,
            "language": term.language,
            "matchType": term.matchType,
            "weight": term.weight,
            "isNegative": bool(term.isNegative),
            "enabled": bool(term.enabled),
            "notes": term.notes,
        }

    def _default_term_set_payloads(self) -> List[Dict[str, Any]]:
        payloads = []
        for key, config in ROUTER_TERM_SET_CONFIG.items():
            set_id = self._term_set_id(key)
            payloads.append({
                "id": set_id,
                "key": key,
                "behavior": config["behavior"],
                "intent": config["intent"],
                "ragMode": config["ragMode"],
                "reasoningMode": config["reasoningMode"],
                "defaultWeight": float(config.get("defaultWeight", 1.0)),
                "enabled": True,
                "systemDefined": True,
                "databaseId": None,
                "userId": None,
                "terms": [
                    {
                        "id": self._term_id(key, normalize_router_text(term), "phrase"),
                        "termSetId": set_id,
                        "termSetKey": key,
                        "term": term,
                        "normalizedTerm": normalize_router_text(term),
                        "language": "any",
                        "matchType": "phrase",
                        "weight": float(config.get("defaultWeight", 1.0)),
                        "isNegative": False,
                        "enabled": True,
                        "notes": None,
                    }
                    for term in config["terms"]
                ],
            })
        return payloads

    def _default_terms_by_key(self) -> Dict[str, List[RouterTerm]]:
        return {
            key: [
                RouterTerm(
                    term=term,
                    normalized_term=normalize_router_text(term),
                    match_type="phrase",
                    weight=float(config.get("defaultWeight", 1.0)),
                    is_negative=False,
                )
                for term in config["terms"]
            ]
            for key, config in ROUTER_TERM_SET_CONFIG.items()
        }

    def _matches(self, normalized_text: str, term: RouterTerm) -> bool:
        value = term.normalized_term
        if not value:
            return False
        if term.match_type == "token":
            return value in set(normalized_text.split())
        if term.match_type == "prefix":
            return any(token.startswith(value) for token in normalized_text.split())
        if term.match_type == "regex":
            try:
                return bool(re.search(value, normalized_text))
            except re.error:
                return False
        return value in normalized_text

    def _term_set_id(self, key: str) -> str:
        return f"system:{key}"

    def _term_id(self, key: str, normalized_term: str, match_type: str) -> str:
        value = f"quriodb-router:{key}:{normalized_term}:{match_type}"
        return str(uuid.uuid5(uuid.NAMESPACE_URL, value))

    def _is_system_term(self, term_set: AIRouterTermSet, term: AIRouterTerm) -> bool:
        expected_id = self._term_id(term_set.key, term.normalizedTerm, term.matchType or "phrase")
        return bool(term_set.systemDefined and term.id == expected_id)


def normalize_router_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or "").lower())
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    ascii_text = ascii_text.replace("\u0111", "d")
    return " ".join(ascii_text.split())


router_term_service = RouterTermService()
