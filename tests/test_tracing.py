import dataclasses
import os
import sys

import pytest

from nl2sql_agent import tracing as tracing_mod
from nl2sql_agent.config import settings as base_settings

_ENV_KEYS = ["LANGCHAIN_TRACING_V2", "LANGCHAIN_API_KEY", "LANGCHAIN_PROJECT", "LANGCHAIN_ENDPOINT"]


@pytest.fixture(autouse=True)
def _restore_tracing_env():
    saved = {key: os.environ.get(key) for key in _ENV_KEYS}
    yield
    for key, value in saved.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


def _settings_with(**overrides):
    return dataclasses.replace(base_settings, **overrides)


def test_configure_tracing_disabled_by_default(monkeypatch):
    monkeypatch.setattr(tracing_mod, "_CONFIGURED", False)
    monkeypatch.setattr(tracing_mod, "settings", _settings_with(langsmith_tracing=False))
    assert tracing_mod.configure_tracing() is False
    assert os.environ["LANGCHAIN_TRACING_V2"] == "false"


def test_configure_tracing_enabled_with_key(monkeypatch):
    monkeypatch.setattr(tracing_mod, "_CONFIGURED", False)
    monkeypatch.setattr(
        tracing_mod,
        "settings",
        _settings_with(
            langsmith_tracing=True,
            langsmith_api_key="test-key",
            langsmith_project="proj",
            langsmith_endpoint="https://example.com",
        ),
    )
    assert tracing_mod.configure_tracing() is True
    assert os.environ["LANGCHAIN_TRACING_V2"] == "true"
    assert os.environ["LANGCHAIN_API_KEY"] == "test-key"
    assert os.environ["LANGCHAIN_PROJECT"] == "proj"
    assert os.environ["LANGCHAIN_ENDPOINT"] == "https://example.com"


def test_configure_tracing_warns_when_key_missing(monkeypatch):
    monkeypatch.setattr(tracing_mod, "_CONFIGURED", False)
    monkeypatch.setattr(tracing_mod, "settings", _settings_with(langsmith_tracing=True, langsmith_api_key=None))
    assert tracing_mod.configure_tracing() is False


def test_configure_tracing_is_idempotent(monkeypatch):
    monkeypatch.setattr(tracing_mod, "_CONFIGURED", True)
    monkeypatch.setattr(tracing_mod, "settings", _settings_with(langsmith_tracing=True, langsmith_api_key="k"))
    assert tracing_mod.configure_tracing() is True


def test_traceable_returns_working_decorator():
    @tracing_mod.traceable(name="sample")
    def add(a, b):
        return a + b

    assert add(2, 3) == 5


def test_traceable_falls_back_to_identity_when_langsmith_missing(monkeypatch):
    monkeypatch.setitem(sys.modules, "langsmith", None)

    @tracing_mod.traceable(name="sample")
    def add(a, b):
        return a + b

    assert add(2, 3) == 5
