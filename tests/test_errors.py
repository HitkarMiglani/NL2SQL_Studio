from flask import Flask

from nl2sql_agent.errors import AppError, ForbiddenSqlError, NotFoundError, ValidationError, register_error_handlers


def _build_app() -> Flask:
    app = Flask(__name__)
    register_error_handlers(app)

    @app.route("/validation")
    def _validation():
        raise ValidationError("bad input")

    @app.route("/missing")
    def _missing():
        raise NotFoundError("missing thing")

    @app.route("/forbidden")
    def _forbidden():
        raise ForbiddenSqlError("nope")

    @app.route("/boom")
    def _boom():
        raise RuntimeError("kaboom")

    return app


def test_app_error_custom_status_and_code():
    err = AppError("custom", status_code=418, error_code="teapot")
    assert err.status_code == 418
    assert err.error_code == "teapot"
    assert err.message == "custom"


def test_app_error_defaults():
    err = AppError("default message")
    assert err.status_code == 400
    assert err.error_code == "app_error"


def test_validation_error_response():
    client = _build_app().test_client()
    response = client.get("/validation")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "bad input"
    assert payload["error_code"] == "validation_error"
    assert "request_id" in payload


def test_not_found_error_response():
    client = _build_app().test_client()
    response = client.get("/missing")
    assert response.status_code == 404
    assert response.get_json()["error_code"] == "not_found"


def test_forbidden_sql_error_response():
    client = _build_app().test_client()
    response = client.get("/forbidden")
    assert response.status_code == 400
    assert response.get_json()["error_code"] == "forbidden_sql"


def test_flask_404_handler_for_unknown_route():
    client = _build_app().test_client()
    response = client.get("/does-not-exist")
    assert response.status_code == 404
    assert response.get_json()["error_code"] == "not_found"


def test_flask_405_handler_for_wrong_method():
    client = _build_app().test_client()
    response = client.post("/validation")
    assert response.status_code == 405
    assert response.get_json()["error_code"] == "method_not_allowed"


def test_unexpected_exception_returns_500():
    client = _build_app().test_client()
    response = client.get("/boom")
    assert response.status_code == 500
    assert response.get_json()["error_code"] == "internal_error"
