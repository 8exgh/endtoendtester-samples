using Shop.Pricing;

namespace Shop.Ordering;

public sealed record ChargeRequest(Money Amount, string Reference, string IdempotencyKey);

public sealed record ChargeResult(bool Succeeded, string? PaymentIntentId = null, string? Reason = null)
{
    public static ChargeResult Ok(string id) => new(true, id);
    public static ChargeResult Declined(string reason) => new(false, Reason: reason);
}

public interface IPaymentGateway
{
    Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default);
}

public interface IInventory
{
    Task<bool> ReserveAsync(string sku, int quantity, CancellationToken cancellationToken = default);
    Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken = default);
}

public sealed record Order(string Reference, string Sku, int Quantity, Money Amount, CustomerTier Tier);

public abstract record Outcome
{
    public sealed record Placed(string PaymentIntentId, Money Total) : Outcome;
    public sealed record OutOfStock(string Sku) : Outcome;
    public sealed record Declined(string Reason) : Outcome;
}

public sealed class InsufficientStockException(string sku, int requested)
    : Exception($"cannot reserve {requested} of {sku}")
{
    public string Sku { get; } = sku;
    public int Requested { get; } = requested;
}
