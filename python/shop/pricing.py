"""The rules, as pure functions of their inputs.

https://endtoendtester.com/languages/python
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

FREE_SHIPPING_THRESHOLD_CENTS = 5_000
STANDARD_SHIPPING_CENTS = 395


class MoneyError(ValueError):
    """Raised when an amount cannot be interpreted."""


@dataclass(frozen=True)
class Line:
    sku: str
    unit_cents: int
    quantity: int = 1


def subtotal_cents(lines: list[Line]) -> int:
    return sum(line.unit_cents * line.quantity for line in lines)


def shipping_cents(subtotal: int, tier: str = "standard") -> int:
    """Free at or above the threshold. The boundary is the point."""
    if tier == "gold" or subtotal >= FREE_SHIPPING_THRESHOLD_CENTS:
        return 0
    return STANDARD_SHIPPING_CENTS


def total_cents(lines: list[Line], tier: str = "standard") -> int:
    subtotal = subtotal_cents(lines)
    return subtotal + shipping_cents(subtotal, tier)


def split_evenly(cents: int, ways: int) -> list[int]:
    """The parts always sum back to the whole; losing a penny here is the
    classic money bug."""
    if ways < 1:
        raise MoneyError("cannot split fewer than one way")
    base, remainder = divmod(cents, ways)
    return [base + (1 if i < remainder else 0) for i in range(ways)]


@dataclass
class Token:
    subject: str
    expires_at: datetime


def is_expired(token: Token, now: datetime | None = None) -> bool:
    """Inclusive: a token is dead at the instant it expires."""
    return token.expires_at <= (now or datetime.now(timezone.utc))
