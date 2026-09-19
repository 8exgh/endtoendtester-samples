package shop.pricing;

/** Money in minor units. A record, so equality is by value. */
public record Money(int cents) {
    public static final Money ZERO = new Money(0);

    /* addExact and multiplyExact, not + and *: Java's int arithmetic wraps
       silently, so an overflowing total becomes a large negative amount and
       nothing anywhere reports a problem. On money that is the worst
       possible failure mode, and the test for it is one line. */
    public Money plus(Money other) {
        return new Money(Math.addExact(cents, other.cents));
    }

    public Money times(int quantity) {
        return new Money(Math.multiplyExact(cents, quantity));
    }

    @Override
    public String toString() {
        return "£%d.%02d".formatted(cents / 100, Math.abs(cents % 100));
    }
}
