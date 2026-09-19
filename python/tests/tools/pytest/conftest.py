"""Fixtures compose: a test names what it needs and the graph is resolved
for it. https://endtoendtester.com/tools/pytest
"""
import pytest

from shop.pricing import Line


@pytest.fixture(scope="session")
def catalogue() -> dict[str, int]:
    """Expensive and read-only, so it is built once for the whole run."""
    return {"book-1": 1_200, "pen-2": 500, "desk-3": 40_000}


@pytest.fixture
def basket(catalogue: dict[str, int]) -> list[Line]:
    """Function-scoped, so one test mutating it cannot reach another."""
    return [Line(sku="book-1", unit_cents=catalogue["book-1"], quantity=2)]


@pytest.fixture
def audit_log() -> list[str]:
    entries: list[str] = []
    yield entries
    # Everything after the yield is teardown, and it runs even on failure.
    entries.clear()
