"""https://endtoendtester.com/tools/pytest"""
import pytest

from shop.pricing import Line, shipping_cents, split_evenly, subtotal_cents, total_cents


def test_a_fixture_is_resolved_from_the_name_of_the_parameter(basket):
    assert subtotal_cents(basket) == 2_400


def test_a_function_scoped_fixture_is_rebuilt_for_every_test(basket):
    basket.append(Line(sku="pen-2", unit_cents=500))

    assert len(basket) == 2


def test_and_the_next_test_does_not_see_that_change(basket):
    assert len(basket) == 1


@pytest.mark.parametrize(
    "subtotal,expected",
    [(12_000, 0), (5_000, 0), (4_999, 395), (0, 395)],
)
def test_shipping_is_free_at_or_above_the_threshold(subtotal, expected):
    assert shipping_cents(subtotal) == expected


@pytest.mark.parametrize("tier", ["standard", "gold"])
@pytest.mark.parametrize("subtotal", [0, 4_999, 5_000])
def test_every_combination_of_tier_and_subtotal_is_priced(tier, subtotal):
    """Stacking parametrize produces the cartesian product: six tests."""
    assert shipping_cents(subtotal, tier) in (0, 395)


@pytest.mark.parametrize(
    "cents,ways",
    [(1_000, 3), (1, 3), (999_999, 7), (0, 4)],
    ids=["indivisible", "smaller-than-ways", "large", "nothing"],
)
def test_split_shares_always_sum_back_to_the_whole(cents, ways):
    shares = split_evenly(cents, ways)

    assert len(shares) == ways
    assert sum(shares) == cents
    assert max(shares) - min(shares) <= 1


def test_the_session_fixture_is_shared_but_treated_as_read_only(catalogue):
    assert catalogue["book-1"] == 1_200


def test_gold_customers_pay_no_shipping_whatever_the_basket(basket):
    assert total_cents(basket, "gold") == 2_400
