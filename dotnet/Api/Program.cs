using Shop.Ordering;
using Shop.Pricing;

/* A small ASP.NET Core service, so the component test has a real
   application to start in-process: real routing, real model binding, real
   DI, real filters. https://endtoendtester.com/testing-levels/component-testing */

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IPaymentGateway, AlwaysApprovesGateway>();
builder.Services.AddSingleton<IInventory, UnlimitedInventory>();
builder.Services.AddSingleton<OrderStore>();
builder.Services.AddScoped<Checkout>();

var app = builder.Build();

app.MapGet("/health", (OrderStore store) => Results.Ok(new { status = "ok", orders = store.Count }));

app.MapPost("/orders", async (PlaceOrderRequest request, Checkout checkout, OrderStore store) =>
{
    if (!Catalogue.TryGetValue(request.Sku, out var unitCents))
    {
        return Results.UnprocessableEntity(new { error = "unknown_sku", field = "sku" });
    }
    if (request.Quantity < 1 || request.Quantity > 100)
    {
        return Results.UnprocessableEntity(new { error = "invalid_quantity", field = "quantity" });
    }

    var reference = $"ORD-{store.Count + 1}";
    var order = new Order(reference, request.Sku, request.Quantity, new Money(unitCents * request.Quantity), CustomerTier.Standard);

    var outcome = await checkout.PlaceAsync(order);
    return outcome switch
    {
        Outcome.Placed placed => Results.Created($"/orders/{reference}",
            store.Add(new OrderView(reference, request.Sku, request.Quantity, placed.Total.Cents, "paid"))),
        Outcome.OutOfStock stock => Results.Conflict(new { error = "out_of_stock", sku = stock.Sku }),
        Outcome.Declined declined => Results.Json(new { error = "card_declined", reason = declined.Reason },
            statusCode: StatusCodes.Status402PaymentRequired),
        _ => Results.Problem("unreachable")
    };
});

app.MapGet("/orders/{reference}", (string reference, OrderStore store) =>
    store.Find(reference) is { } found ? Results.Ok(found) : Results.NotFound(new { error = "not_found" }));

app.MapGet("/orders", (OrderStore store) => Results.Ok(new { items = store.All() }));

app.Run();

/* The generated top-level Program class is internal and non-static, so the
   partial has to match — and it has to be public for
   WebApplicationFactory<Program> to see it from the test project. This
   one line is the whole trick, and forgetting it is the first error
   everybody hits. */
public partial class Program
{
    internal static readonly Dictionary<string, int> Catalogue = new()
    {
        ["book-1"] = 1_200,
        ["pen-2"] = 500,
        ["desk-3"] = 40_000
    };
}

public sealed record PlaceOrderRequest(string Sku, int Quantity);

public sealed record OrderView(string Reference, string Sku, int Quantity, int TotalCents, string Status);

public sealed class OrderStore
{
    private readonly List<OrderView> _orders = [];
    public int Count => _orders.Count;
    public OrderView Add(OrderView order) { _orders.Add(order); return order; }
    public OrderView? Find(string reference) => _orders.FirstOrDefault(o => o.Reference == reference);
    public IReadOnlyList<OrderView> All() => _orders;
}

public sealed class AlwaysApprovesGateway : IPaymentGateway
{
    public Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default) =>
        Task.FromResult(ChargeResult.Ok($"pi_{Guid.NewGuid():N}"));
}

public sealed class UnlimitedInventory : IInventory
{
    public Task<bool> ReserveAsync(string sku, int quantity, CancellationToken cancellationToken = default) =>
        Task.FromResult(true);
    public Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;
}
