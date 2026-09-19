"""A module whose I/O is injectable, so no patching is needed to test it.

https://endtoendtester.com/languages/python
"""
from __future__ import annotations

from typing import Callable

FALLBACK_GBP_RATE = 0.79


def live_rates() -> dict[str, float]:  # pragma: no cover - the real I/O
    raise RuntimeError("live_rates would make a network call")


def quote_gbp(usd_cents: int, rates_source: Callable[[], dict[str, float]] | None = None) -> int:
    """Pass the source in rather than reaching for it.

    `None` rather than `live_rates` as the default, deliberately: a default
    argument is evaluated once, when the function is *defined*, so writing
    `rates_source=live_rates` captures the original function object and
    `patch("shop.rates.live_rates")` afterwards has no effect on it. Looking
    the name up at call time keeps the module patchable as well as
    injectable. `quote_gbp_eagerly_bound` below is the same function with
    the trap left in, and the test suite proves the difference.
    """
    source = rates_source or live_rates
    try:
        rate = source()["GBP"]
    except Exception:
        rate = FALLBACK_GBP_RATE
    return round(usd_cents * rate)


def quote_gbp_eagerly_bound(usd_cents: int, rates_source: Callable[[], dict[str, float]] = live_rates) -> int:
    """Kept only to demonstrate the trap. Do not write this."""
    try:
        rate = rates_source()["GBP"]
    except Exception:
        rate = FALLBACK_GBP_RATE
    return round(usd_cents * rate)
