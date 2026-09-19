namespace Shop.Pricing;

public enum CustomerTier { Standard, Gold }

public sealed record DiscountPolicy(Money Threshold, int Percent);

public sealed record Priced(Money Subtotal, Money Discount, Money Shipping)
{
    public Money Total => new(Subtotal.Cents - Discount.Cents + Shipping.Cents);
}

public static class Pricing
{
    public static readonly Money FreeShippingThreshold = new(5_000);
    public static readonly Money StandardShipping = new(395);

    /// <summary>Free at or above the threshold. The boundary is the point.</summary>
    public static Money ShippingFor(Money subtotal, CustomerTier tier) =>
        tier == CustomerTier.Gold || subtotal.Cents >= FreeShippingThreshold.Cents
            ? Money.Zero
            : StandardShipping;

    public static Priced Apply(Money subtotal, CustomerTier tier, DiscountPolicy policy)
    {
        var discount = subtotal.Cents >= policy.Threshold.Cents
            ? new Money((int)Math.Round(subtotal.Cents * (policy.Percent / 100m), MidpointRounding.AwayFromZero))
            : Money.Zero;

        var discounted = new Money(subtotal.Cents - discount.Cents);
        return new Priced(subtotal, discount, ShippingFor(discounted, tier));
    }
}
