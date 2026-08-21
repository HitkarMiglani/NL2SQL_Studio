import pandas as pd

from nl2sql_agent.evaluation import _parse_judge_response, judge_response


def test_parse_valid_json_response():
    raw = '{"correctness": 5, "relevance": 4, "clarity": 3, "rationale": "Solid answer."}'
    score = _parse_judge_response(raw)
    assert score is not None
    assert score["correctness"] == 5
    assert score["relevance"] == 4
    assert score["clarity"] == 3
    assert score["overall_score"] == 4
    assert score["rationale"] == "Solid answer."


def test_parse_clamps_out_of_range_scores():
    raw = '{"correctness": 9, "relevance": -2, "clarity": 3, "rationale": "x"}'
    score = _parse_judge_response(raw)
    assert score is not None
    assert score["correctness"] == 5
    assert score["relevance"] == 1


def test_parse_handles_markdown_fenced_json():
    raw = '```json\n{"correctness": 3, "relevance": 3, "clarity": 3, "rationale": "ok"}\n```'
    score = _parse_judge_response(raw)
    assert score is not None
    assert score["overall_score"] == 3


def test_parse_returns_none_for_unparsable_text():
    assert _parse_judge_response("not json at all") is None


def test_parse_returns_none_for_malformed_json_block():
    assert _parse_judge_response("{malformed json}") is None


def test_parse_returns_none_for_missing_fields():
    raw = '{"correctness": 3}'
    assert _parse_judge_response(raw) is None


class _StubLLMClient:
    def __init__(self, response_text: str) -> None:
        self._response_text = response_text

    def generate_text(self, prompt: str) -> str:
        return self._response_text


class _FailingLLMClient:
    def generate_text(self, prompt: str) -> str:
        raise RuntimeError("llm unavailable")


def test_judge_response_returns_score_for_valid_response():
    llm_client = _StubLLMClient('{"correctness": 4, "relevance": 5, "clarity": 4, "rationale": "Good"}')
    df = pd.DataFrame({"a": [1, 2]})
    score = judge_response("What is a?", "SELECT a FROM t", df, "Summary text", llm_client)
    assert score is not None
    assert score["correctness"] == 4


def test_judge_response_handles_empty_dataframe():
    llm_client = _StubLLMClient('{"correctness": 3, "relevance": 3, "clarity": 3, "rationale": "ok"}')
    score = judge_response("Q", "SELECT 1", pd.DataFrame(), "summary", llm_client)
    assert score is not None


def test_judge_response_handles_none_result():
    llm_client = _StubLLMClient('{"correctness": 3, "relevance": 3, "clarity": 3, "rationale": "ok"}')
    score = judge_response("Q", "SELECT 1", None, "summary", llm_client)
    assert score is not None


def test_judge_response_returns_none_when_llm_raises():
    score = judge_response("Q", "SELECT 1", None, "summary", _FailingLLMClient())
    assert score is None


def test_judge_response_returns_none_for_unparsable_output():
    llm_client = _StubLLMClient("not json")
    score = judge_response("Q", "SELECT 1", None, "summary", llm_client)
    assert score is None
