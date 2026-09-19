using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Shop.Ordering;
using Shouldly;
using Xunit;

namespace Tests.Component.TestingLevels.ComponentTesting;

/// <summary>
/// The whole application, in-process: real routing, real middleware, real
/// model binding, real DI. Only what is beyond the service's boundary is
/// replaced. https://endtoendtester.com/testing-levels/component-testing
/// </summary>
public class OrdersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public OrdersApiTests(WebApplicationFactory<Program> factory) => _factory = factory;

    private HttpClient ClientWith(IPaymentGateway gateway) =>
        _factory.WithWebHostBuilder(builder =>
            builder.ConfigureServices(services =>
            {
                // Only the boundary is faked. Everything inside is real.
                services.AddSingleton(gateway);
            })).CreateClient();

    private sealed class DecliningGateway : IPaymentGateway
    {
        public Task<ChargeResult> ChargeAsync(ChargeRequest request, CancellationToken cancellationToken = default) =>
            Task.FromResult(ChargeResult.Declined("card_declined"));
    }

    [Fact]
    public async Task Placing_an_order_returns_201_and_its_location()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/orders", new { sku = "book-1", quantity = 2 });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        response.Headers.Location.ShouldNotBeNull();

        // Read it back through the API, so the test describes the contract
        // rather than the internal storage.
        var order = await client.GetFromJsonAsync<OrderView>(response.Headers.Location);
        order!.Quantity.ShouldBe(2);
        order.TotalCents.ShouldBe(2_795); // 2,400 + 395 shipping
        order.Status.ShouldBe("paid");
    }

    [Fact]
    public async Task A_large_order_ships_free()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/orders", new { sku = "desk-3", quantity = 1 });
        var order = await response.Content.ReadFromJsonAsync<OrderView>();

        order!.TotalCents.ShouldBe(40_000);
    }

    /// <summary>The failure a real gateway will not produce on request.</summary>
    [Fact]
    public async Task A_declined_card_returns_402_and_creates_no_order()
    {
        var client = ClientWith(new DecliningGateway());
        var before = await client.GetFromJsonAsync<OrderList>("/orders");

        var response = await client.PostAsJsonAsync("/orders", new { sku = "book-1", quantity = 1 });

        response.StatusCode.ShouldBe(HttpStatusCode.PaymentRequired);
        var after = await client.GetFromJsonAsync<OrderList>("/orders");
        after!.Items.Count.ShouldBe(before!.Items.Count);
    }

    [Theory]
    [InlineData("nope", 1, "unknown_sku")]
    [InlineData("book-1", 0, "invalid_quantity")]
    [InlineData("book-1", 101, "invalid_quantity")]
    public async Task Invalid_input_is_rejected_with_422_and_a_named_field(string sku, int quantity, string error)
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/orders", new { sku, quantity });

        response.StatusCode.ShouldBe(HttpStatusCode.UnprocessableEntity);
        var body = await response.Content.ReadFromJsonAsync<ErrorBody>();
        body!.Error.ShouldBe(error);
    }

    [Fact]
    public async Task An_unknown_order_is_a_404_with_a_shaped_body()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/orders/ORD-does-not-exist");

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<ErrorBody>())!.Error.ShouldBe("not_found");
    }

    private sealed record OrderList(List<OrderView> Items);
    private sealed record ErrorBody(string Error, string? Field);
}
