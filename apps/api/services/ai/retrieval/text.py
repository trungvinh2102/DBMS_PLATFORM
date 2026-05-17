"""
text.py

Text normalization, schema index document construction, and retrieval reason helpers.
"""

import re
from typing import Any, Dict, Iterable, List, Optional

SQL_QUERY_SYNONYMS = {
    "customer": ["client", "account", "buyer"],
    "client": ["customer", "account"],
    "order": ["purchase", "sale", "transaction"],
    "purchase": ["order", "sale", "transaction"],
    "sale": ["order", "purchase", "revenue"],
    "revenue": ["sale", "amount", "total", "price"],
    "invoice": ["bill", "payment"],
    "employee": ["staff", "worker", "user"],
    "user": ["account", "profile", "member"],
    "product": ["item", "sku", "inventory"],
    "payment": ["invoice", "paid", "transaction"],
}

STOP_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "give",
    "how", "i", "in", "is", "list", "me", "of", "on", "or", "show", "the",
    "to", "with", "where", "which", "who",
}


def build_table_search_text(
    table_name: str,
    columns: List[Dict[str, Any]],
    db_type: str = "sql",
    foreign_keys: Optional[List[Dict[str, Any]]] = None,
    indexes: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Builds rich retrieval text with exact table, column, FK, and index signals."""
    fk_list = foreign_keys or []
    column_parts = [
        _format_column_for_index(column, fk_list)
        for column in columns
    ]
    fk_parts = [
        f"- {fk.get('table')}.{fk.get('column')} -> {fk.get('foreignTable')}.{fk.get('foreignColumn')}"
        for fk in fk_list
    ]
    index_parts = [
        f"- {idx.get('name') or idx.get('indexName') or idx.get('column') or idx}"
        for idx in indexes or []
    ]

    return "\n".join([
        f"Table: {table_name}",
        f"Identifier words: {' '.join(split_identifier(table_name))}",
        f"Dialect: {db_type}",
        "Columns:",
        *column_parts,
        "Foreign keys:",
        *(fk_parts or ["- none"]),
        "Indexes:",
        *(index_parts or ["- none"]),
    ])


def expand_query_terms(intent: str) -> List[str]:
    """Expands query terms with conservative SQL/business synonyms."""
    terms = tokenize(intent)
    expanded = list(terms)
    for term in terms:
        expanded.extend(SQL_QUERY_SYNONYMS.get(term, []))
    return list(dict.fromkeys(expanded))


def lexical_score(intent: str, expanded_terms: List[str], description: str) -> float:
    """Scores exact identifiers and expanded query terms for offline retrieval."""
    normalized_description = normalize_text(description)
    description_terms = set(tokenize(description))
    score = 0.0

    for term in expanded_terms:
        if term in description_terms:
            score += 2.0
        elif term and term in normalized_description:
            score += 0.75

    for phrase in identifier_phrases(intent):
        if phrase in normalized_description:
            score += 4.0

    return score


def matched_terms(expanded_terms: Iterable[str], description: str) -> List[str]:
    """Lists terms that explain why a table was selected."""
    description_terms = set(tokenize(description))
    return [term for term in expanded_terms if term in description_terms]


def build_reasons(table_name: str, terms: List[str], description: str) -> List[str]:
    """Creates human-readable retrieval reasons for traces and citations."""
    reasons = []
    normalized_description = normalize_text(description)
    if table_name.lower() in normalized_description:
        reasons.append(f"matched table {table_name}")
    for term in terms[:6]:
        reason_type = "matched column" if f" {term} " in f" {normalized_description} " else "matched term"
        reasons.append(f"{reason_type} {term}")
    if not reasons:
        reasons.append("semantic match")
    return list(dict.fromkeys(reasons))


def foreign_keys_for_table(table_name: str, foreign_keys: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Returns FKs where the table is either source or target."""
    return [
        fk for fk in foreign_keys
        if fk.get("table") == table_name or fk.get("foreignTable") == table_name
    ]


def column_names(columns: List[Dict[str, Any]]) -> List[str]:
    """Extracts column names for retrieval trace output."""
    return [str(column.get("name")) for column in columns if column.get("name")]


def identifier_phrases(text: str) -> List[str]:
    """Extracts exact-ish table or column phrases from natural language."""
    words = [word for word in normalize_text(text).split() if word not in STOP_WORDS]
    phrases = []
    for size in (3, 2):
        for index in range(max(len(words) - size + 1, 0)):
            phrases.append(" ".join(words[index:index + size]))
    return phrases


def tokenize(text: str) -> List[str]:
    """Tokenizes natural language and snake/camel-case identifiers."""
    return [
        token for token in normalize_text(text).split()
        if token and token not in STOP_WORDS
    ]


def normalize_text(text: str) -> str:
    """Normalizes text into searchable lower-case tokens."""
    split = " ".join(split_identifier(str(text)))
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", split.lower())).strip()


def split_identifier(value: str) -> List[str]:
    """Splits snake_case, kebab-case, and camelCase identifiers."""
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", str(value))
    return re.split(r"[_\-\s.]+", spaced)


def _format_column_for_index(column: Dict[str, Any], foreign_keys: List[Dict[str, Any]]) -> str:
    name = str(column.get("name", ""))
    column_type = str(column.get("type", ""))
    nullable = "nullable" if column.get("nullable", True) else "required"
    key_hint = _column_key_hint(name, foreign_keys)
    return f"- {name} {column_type} {nullable} {key_hint}".strip()


def _column_key_hint(column_name: str, foreign_keys: List[Dict[str, Any]]) -> str:
    for fk in foreign_keys:
        if fk.get("column") == column_name:
            return f"foreign key to {fk.get('foreignTable')}.{fk.get('foreignColumn')}"
        if fk.get("foreignColumn") == column_name:
            return f"referenced by {fk.get('table')}.{fk.get('column')}"
    if column_name.lower() in {"id", "uuid"} or column_name.lower().endswith("_id"):
        return "identifier"
    return ""
