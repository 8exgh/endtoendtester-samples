package shop.pricing;

import java.util.List;

/** https://endtoendtester.com/languages/java */
public final class Pricing {
    public static final Money FREE_SHIPPING_THRESHOLD = new Money(5_000);
    public static final Money STANDARD_SHIPPING = new Money(395);

    public enum Tier { STANDARD, GOLD }

    public record Line(String sku, int unitCents, int quantity) {
        public Money total() {
            return new Money(unitCents).times(quantity);
        }
    }

    private Pricing() {
    }

    public static Money subtotal(List<Line> lines) {
        return lines.stream().map(Line::total).reduce(Money.ZERO, Money::plus);
    }

    /** Free at or above the threshold. The boundary is the point. */
    public static Money shippingFor(Money subtotal, Tier tier) {
        if (tier == Tier.GOLD || subtotal.cents() >= FREE_SHIPPING_THRESHOLD.cents()) {
            return Money.ZERO;
        }
        return STANDARD_SHIPPING;
    }

    public static Money total(List<Line> lines, Tier tier) {
        Money subtotal = subtotal(lines);
        return subtotal.plus(shippingFor(subtotal, tier));
    }
}
