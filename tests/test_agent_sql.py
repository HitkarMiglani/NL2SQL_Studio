import dataclasses
import sqlite3
from typing import cast

import pytest

from nl2sql_agent import agent as agent_module
from nl2sql_agent import db as db_module
from nl2sql_agent.agent import (
    AgentState,
    _build_correction_prompt,
    _build_fallback_prompt,
    _execute_sql_read_only,
    _extract_section,
    _is_forbidden_sql,
    _log_transition,
    _sanitize_sql,
    load_llm_client,
)
from nl2sql_agent.config import settings as base_settings


def test_sanitize_sql_strips_markdown_fences():
    raw = "```sql\nSELECT * FROM employees\n```"
    assert _sanitize_sql(raw) == "SELECT * FROM employees"


def test_sanitize_sql_strips_trailing_semicolon():
    assert _sanitize_sql("SELECT 1;") == "SELECT 1"


def test_sanitize_sql_handles_with_clause():
    raw = "WITH cte AS (SELECT 1) SELECT * FROM cte"
    assert _sanitize_sql(raw).startswith("WITH cte")


def test_is_forbidden_sql_blocks_writes():
    assert _is_forbidden_sql("DROP TABLE employees")
    assert _is_forbidden_sql("DELETE FROM employees")
    assert _is_forbidden_sql("UPDATE employees SET name = 'x'")
    assert _is_forbidden_sql("INSERT INTO employees VALUES (1)")


def test_is_forbidden_sql_allows_reads():
    assert not _is_forbidden_sql("SELECT * FROM employees")
    assert not _is_forbidden_sql("WITH cte AS (SELECT 1) SELECT * FROM cte")


def test_extract_section_returns_matching_text():
    text = "Reasoning: because of X\nAnswer: 42"
    assert _extract_section(text, "Reasoning") == "because of X"


def test_extract_section_returns_empty_when_missing():
    assert _extract_section("no headings here", "Reasoning") == ""


def test_build_correction_prompt_includes_error_trace():
    prompt = _build_correction_prompt("q", "schema", "SELECT bad", "syntax error")
    assert "syntax error" in prompt
    assert "SELECT bad" in prompt
    assert "q" in prompt


def test_build_fallback_prompt_includes_question():
    prompt = _build_fallback_prompt("How many employees?")
    assert "How many employees?" in prompt


def test_execute_sql_read_only_deduplicates_columns(tmp_path):
    db_path = tmp_path / "agent_test.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE t (id INTEGER, id2 INTEGER)")
    conn.execute("INSERT INTO t VALUES (1, 2)")
    conn.commit()
    conn.close()

    result = _execute_sql_read_only(str(db_path), "SELECT id, id2 AS id FROM t")
    assert list(result.columns) == ["id", "id_2"]
    db_module.dispose_engines()


def test_log_transition_does_not_raise():
    state = cast(
        "AgentState",
        {
            "query": "q",
            "schema_context": "schema",
            "schema_confidence": 1.0,
            "sql_query": "SELECT 1",
            "db_result": None,
            "error_trace": "",
            "retry_count": 1,
            "status": "ok",
        },
    )
    _log_transition("NODE", state, "success")


def test_load_llm_client_rejects_unknown_provider():
    with pytest.raises(ValueError):
        load_llm_client(provider="bogus")


def test_load_llm_client_requires_gemini_key(monkeypatch):
    monkeypatch.setattr(agent_module, "settings", dataclasses.replace(base_settings, gemini_api_key=None))
    with pytest.raises(RuntimeError):
        agent_module.load_llm_client(provider="gemini", api_key=None)


def test_load_llm_client_requires_groq_key(monkeypatch):
    monkeypatch.setattr(agent_module, "settings", dataclasses.replace(base_settings, groq_api_key=None))
    with pytest.raises(RuntimeError):
        agent_module.load_llm_client(provider="groq", api_key=None)
