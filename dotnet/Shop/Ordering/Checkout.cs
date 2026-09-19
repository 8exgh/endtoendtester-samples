using Shop.Pricing;

namespace Shop.Ordering;

/// <summary>
/// Every dependency arrives through the constructor, including the clock —
/// which is what makes the idempotency key testable at all.
/// https://endtoendtester.com/practices/dependency-injection
/// </summary>
public sealed class Checkout(IPaymentGateway gateway, IInventory inventory, TimeProvider clock)
{
    private static readonly DiscountPolicy NoDiscount = new(new Money(int.MaxValue), 0);

    public async Task<Outcome> PlaceAsync(Order order, DiscountPolicy? policy = null, CancellationToken cancellationToken = default)
    {
        if (!await inventory.ReserveAsync(order.Sku, order.Quantity, cancellationToken))
        {
            return new Outcome.OutOfStock(order.Sku);
        }

        var priced = Pricing.Pricing.Apply(order.Amount, order.Tier, policy ?? NoDiscount);

        // Stable for the day, so a retry on the same day cannot charge twice.
        var key = $"{order.Reference}-{clock.GetUtcNow():yyyy-MM-dd}";
        var charge = await gateway.ChargeAsync(new ChargeRequest(priced.Total, order.Reference, key), cancellationToken);

        if (!charge.Succeeded)
        {
            // The compensating action. Nothing else in the system will do it.
            await inventory.ReleaseAsync(order.Sku, order.Quantity, cancellationToken);
            return new Outcome.Declined(charge.Reason ?? "declined");
        }

        return new Outcome.Placed(charge.PaymentIntentId!, priced.Total);
    }
}
