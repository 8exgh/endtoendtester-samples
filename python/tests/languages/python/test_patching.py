"""The patching rules that catch everyone, and the design change that makes
patching unnecessary. https://endtoendtester.com/languages/python
"""
from unittest.mock import AsyncMock, Mock, create_autospec, patch

import pytest

from shop import rates
from shop.pricing import FREE_SHIPPING_THRESHOLD_CENTS, shipping_cents
from shop.rates import quote_gbp, quote_gbp_eagerly_bound


def test_passing_the_dependency_in_needs_no_patching_at_all():
    assert quote_gbp(10_000, rates_source=lambda: {"GBP": 0.79}) == 7_900


def test_falling_back_when_the_source_raises():
    def unavailable():
        raise TimeoutError("upstream is down")

    assert quote_gbp(10_000, rates_source=unavailable) == 7_900


def test_patch_targets_the_name_in_the_module_that_uses_it():
    """The rule everybody gets wrong once: patch where the name is *used*.

    `quote_gbp` looks `live_rates` up in `shop.rates` at call time, so that
    is the name to replace.
    """
    with patch("shop.rates.live_rates", return_value={"GBP": 0.5}):
        assert quote_gbp(1_000) == 500


def test_a_default_argument_is_bound_when_the_function_is_defined():
    """The subtler half of the same trap, and the reason `quote_gbp` takes
    `None` rather than the function itself as its default.

    `quote_gbp_eagerly_bound` captured the original `live_rates` object at
    import time. Patching the module attribute afterwards rebinds the name
    and leaves that captured reference untouched — so the patch appears to
    do nothing, which is a genuinely baffling half hour the first time.
    """
    with patch("shop.rates.live_rates", return_value={"GBP": 0.5}):
        assert quote_gbp(1_000) == 500          # late-bound: patched
        assert quote_gbp_eagerly_bound(1_000) == 790  # captured: falls back


def test_and_passing_the_stub_in_works_for_both():
    stub = lambda: {"GBP": 0.5}

    assert quote_gbp(1_000, rates_source=stub) == 500
    assert quote_gbp_eagerly_bound(1_000, rates_source=stub) == 500


def test_a_plain_mock_accepts_a_typo_and_a_spec_does_not():
    loose = Mock()
    loose.chrage(cents=100)  # passes silently: this is the hazard

    strict = create_autospec(rates, instance=False)
    with pytest.raises(AttributeError):
        strict.live_rats()


def test_autospec_enforces_the_real_signature():
    stub = create_autospec(rates.quote_gbp)
    stub(1_000, rates_source=lambda: {"GBP": 1.0})

    with pytest.raises(TypeError):
        stub(1_000, not_a_parameter=True)


@pytest.mark.parametrize(
    "subtotal,expected",
    [(FREE_SHIPPING_THRESHOLD_CENTS, 0), (FREE_SHIPPING_THRESHOLD_CENTS - 1, 395)],
)
def test_the_threshold_boundary_is_stated_in_terms_of_the_constant(subtotal, expected):
    assert shipping_cents(subtotal) == expected


async def test_an_async_double_must_be_an_async_mock():
    """A plain Mock returns a Mock, not a coroutine, and the failure that
    produces is confusing out of all proportion."""
    gateway = AsyncMock()
    gateway.charge.return_value = {"id": "pi_1"}

    assert await gateway.charge(cents=100) == {"id": "pi_1"}
    gateway.charge.assert_awaited_once_with(cents=100)
