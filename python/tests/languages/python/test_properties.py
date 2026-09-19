"""Property-based testing, which finds the boundary bugs that example-based
tests only cover at the three values somebody thought of.
https://endtoendtester.com/languages/python
"""
from datetime import datetime, timedelta, timezone

from freezegun import freeze_time
from hypothesis import given, settings
from hypothesis import strategies as st

from shop.pricing import Token, is_expired, shipping_cents, split_evenly, total_cents
from shop.pricing import Line


@given(cents=st.integers(min_value=0, max_value=10_000_000), ways=st.integers(min_value=1, max_value=50))
def test_a_split_always_sums_back_to_the_whole(cents, ways):
    assert sum(split_evenly(cents, ways)) == cents


@given(cents=st.integers(min_value=0, max_value=10_000_000), ways=st.integers(min_value=1, max_value=50))
def test_no_share_is_ever_negative_or_more_than_one_penny_from_another(cents, ways):
    shares = split_evenly(cents, ways)

    assert min(shares) >= 0
    assert max(shares) - min(shares) <= 1


@given(subtotal=st.integers(min_value=0, max_value=10_000_000))
def test_shipping_is_only_ever_one_of_two_prices(subtotal):
    assert shipping_cents(subtotal) in (0, 395)


@given(
    unit_cents=st.integers(min_value=0, max_value=100_000),
    quantity=st.integers(min_value=0, max_value=1_000),
)
@settings(max_examples=200)
def test_a_total_is_never_less_than_its_subtotal(unit_cents, quantity):
    lines = [Line(sku="x", unit_cents=unit_cents, quantity=quantity)]

    assert total_cents(lines) >= unit_cents * quantity


@freeze_time("2026-01-01 13:00:00")
def test_a_token_is_expired_at_exactly_its_expiry_instant():
    token = Token(subject="alice", expires_at=datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc))

    assert is_expired(token) is True


@freeze_time("2026-01-01 12:59:59")
def test_and_alive_one_second_earlier():
    token = Token(subject="alice", expires_at=datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc))

    assert is_expired(token) is False


def test_an_injected_clock_needs_no_freezing_library_at_all():
    token = Token(subject="alice", expires_at=datetime(2026, 1, 1, 13, 0, tzinfo=timezone.utc))

    assert is_expired(token, now=token.expires_at + timedelta(seconds=1)) is True
