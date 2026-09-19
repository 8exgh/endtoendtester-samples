using Microsoft.Extensions.Time.Testing;
using NSubstitute;
using Shop.Ordering;
using Shop.Pricing;
using Shouldly;
using Xunit;

namespace Tests.XUnit.Tools.MockingFrameworks;

/// <summary>
/// The same tests as the Moq sample, in NSubstitute — so the syntax
/// difference is visible and the capability difference (there isn't one)
/// is too. https://endtoendtester.com/tools/mocking-frameworks
/// </summary>
public class NSubstituteTests
{
    private static readonly Order AnOrder = new("ORD-1", "book-1", 2, new Money(4_000), CustomerTier.Standard);
    private readonly FakeTimeProvider _clock = new(DateTimeOffset.Parse("2026-01-01T12:00:00Z"));

    [Fact]
    public async Task Charges_once_the_stock_is_reserved()
    {
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.ChargeAsync(Arg.Any<ChargeRequest>(), Arg.Any<CancellationToken>())
               .Returns(ChargeResult.Ok("pi_1"));
        var inventory = Substitute.For<IInventory>();
        inventory.ReserveAsync("book-1", 2, Arg.Any<CancellationToken>()).Returns(true);

        var outcome = await new Checkout(gateway, inventory, _clock).PlaceAsync(AnOrder);

        outcome.ShouldBeOfType<Outcome.Placed>().PaymentIntentId.ShouldBe("pi_1");
        await gateway.Received(1).ChargeAsync(Arg.Any<ChargeRequest>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Releases_the_reservation_when_the_card_is_declined()
    {
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.ChargeAsync(Arg.Any<ChargeRequest>(), Arg.Any<CancellationToken>())
               .Returns(ChargeResult.Declined("card_declined"));
        var inventory = Substitute.For<IInventory>();
        inventory.ReserveAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>()).Returns(true);

        await new Checkout(gateway, inventory, _clock).PlaceAsync(AnOrder);

        await inventory.Received(1).ReleaseAsync("book-1", 2, Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// A hand-written fake, which is frequently better than either library:
    /// real behaviour, a domain assertion surface, and no expectation
    /// syntax to read. https://endtoendtester.com/testing-levels/test-doubles
    /// </summary>
    private sealed class FakeInventory : IInventory
    {
        private readonly Dictionary<string, int> _stock;
        public List<(string Sku, int Quantity)> Released { get; } = [];

        public FakeInventory(params (string Sku, int Quantity)[] stock) =>
            _stock = stock.ToDictionary(item => item.Sku, item => item.Quantity);

        public Task<bool> ReserveAsync(string sku, int quantity, CancellationToken cancellationToken = default)
        {
            if (!_stock.TryGetValue(sku, out var available) || available < quantity) return Task.FromResult(false);
            _stock[sku] = available - quantity;
            return Task.FromResult(true);
        }

        public Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken = default)
        {
            Released.Add((sku, quantity));
            _stock[sku] = _stock.GetValueOrDefault(sku) + quantity;
            return Task.CompletedTask;
        }

        public int Available(string sku) => _stock.GetValueOrDefault(sku);
    }

    [Fact]
    public async Task A_fake_asserts_on_state_rather_than_on_calls()
    {
        var gateway = Substitute.For<IPaymentGateway>();
        gateway.ChargeAsync(Arg.Any<ChargeRequest>(), Arg.Any<CancellationToken>())
               .Returns(ChargeResult.Declined("nope"));
        var inventory = new FakeInventory(("book-1", 5));

        await new Checkout(gateway, inventory, _clock).PlaceAsync(AnOrder);

        // The stock came back, which is the behaviour. That it happened via
        // a call to ReleaseAsync is an implementation detail.
        inventory.Available("book-1").ShouldBe(5);
        inventory.Released.ShouldBe([("book-1", 2)]);
    }

    [Fact]
    public async Task A_fake_refuses_what_it_does_not_have_in_stock()
    {
        var inventory = new FakeInventory(("book-1", 1));

        var outcome = await new Checkout(Substitute.For<IPaymentGateway>(), inventory, _clock).PlaceAsync(AnOrder);

        outcome.ShouldBeOfType<Outcome.OutOfStock>().Sku.ShouldBe("book-1");
    }
}
