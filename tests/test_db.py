import sqlite3

import pytest

from nl2sql_agent import db


@pytest.fixture
def sample_db(tmp_path):
    db_path = tmp_path / "sample.db"
    conn = sqlite3.connect(db_path)
    conn.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)")
    conn.executemany("INSERT INTO items (id, name) VALUES (?, ?)", [(1, "a"), (2, "b")])
    conn.commit()
    conn.close()
    yield str(db_path)
    db.dispose_engines()


def test_read_sql_query_returns_dataframe(sample_db):
    result = db.read_sql_query("SELECT * FROM items ORDER BY id", sample_db)
    assert list(result["name"]) == ["a", "b"]


def test_fetch_rows_returns_list_of_dicts(sample_db):
    rows = db.fetch_rows("SELECT * FROM items ORDER BY id", sample_db)
    assert rows == [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]


def test_check_connection_true_for_valid_db(sample_db):
    assert db.check_connection(sample_db) is True


def test_check_connection_false_for_missing_db(tmp_path):
    missing_path = str(tmp_path / "does_not_exist.db")
    assert db.check_connection(missing_path) is False


def test_get_read_only_engine_is_cached(sample_db):
    engine_a = db.get_read_only_engine(sample_db)
    engine_b = db.get_read_only_engine(sample_db)
    assert engine_a is engine_b


def test_dispose_engines_clears_cache(sample_db):
    db.get_read_only_engine(sample_db)
    assert db._engine_cache
    db.dispose_engines()
    assert not db._engine_cache
