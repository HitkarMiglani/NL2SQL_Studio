import dataclasses
import json
import logging

from nl2sql_agent import logging_utils as lu


def test_new_request_id_is_12_hex_chars():
    rid = lu.new_request_id()
    assert len(rid) == 12
    int(rid, 16)


def test_set_and_get_request_id_roundtrip():
    lu.set_request_id("abc123")
    assert lu.get_request_id() == "abc123"


def test_set_request_id_generates_when_none():
    rid = lu.set_request_id(None)
    assert rid == lu.get_request_id()
    assert len(rid) == 12


def test_request_id_filter_sets_attribute_on_record():
    lu.set_request_id("filter-test")
    record = logging.LogRecord(
        name="x", level=logging.INFO, pathname=__file__, lineno=1, msg="m", args=(), exc_info=None
    )
    filt = lu._RequestIdFilter()
    assert filt.filter(record) is True
    assert record.request_id == "filter-test"


def test_json_formatter_includes_expected_fields():
    formatter = lu._JsonFormatter()
    record = logging.LogRecord(
        name="test", level=logging.INFO, pathname=__file__, lineno=1,
        msg="hello %s", args=("world",), exc_info=None,
    )
    record.request_id = "req-1"
    payload = json.loads(formatter.format(record))
    assert payload["message"] == "hello world"
    assert payload["level"] == "INFO"
    assert payload["logger"] == "test"
    assert payload["request_id"] == "req-1"
    assert "exception" not in payload


def test_json_formatter_includes_exception_info():
    formatter = lu._JsonFormatter()
    try:
        raise ValueError("boom")
    except ValueError:
        import sys

        record = logging.LogRecord(
            name="test", level=logging.ERROR, pathname=__file__, lineno=1,
            msg="failed", args=(), exc_info=sys.exc_info(),
        )
    payload = json.loads(formatter.format(record))
    assert "exception" in payload
    assert "ValueError" in payload["exception"]


def test_configure_logging_sets_up_text_handler(monkeypatch):
    monkeypatch.setattr(lu, "_CONFIGURED", False)
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    try:
        lu.configure_logging()
        assert lu._CONFIGURED is True
        assert len(root_logger.handlers) == 1
        handler = root_logger.handlers[0]
        assert isinstance(handler.formatter, logging.Formatter)
        assert not isinstance(handler.formatter, lu._JsonFormatter)
    finally:
        root_logger.handlers = original_handlers


def test_configure_logging_sets_up_json_handler(monkeypatch):
    monkeypatch.setattr(lu, "_CONFIGURED", False)
    monkeypatch.setattr(lu, "settings", dataclasses.replace(lu.settings, log_format="json"))
    root_logger = logging.getLogger()
    original_handlers = list(root_logger.handlers)
    try:
        lu.configure_logging()
        handler = root_logger.handlers[0]
        assert isinstance(handler.formatter, lu._JsonFormatter)
    finally:
        root_logger.handlers = original_handlers


def test_get_logger_returns_logger_instance():
    logger = lu.get_logger("MY_LOGGER")
    assert isinstance(logger, logging.Logger)
    assert logger.name == "MY_LOGGER"
