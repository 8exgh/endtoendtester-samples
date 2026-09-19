using Microsoft.Extensions.Time.Testing;
using Moq;
using Shop.Ordering;
using Shop.Pricing;
using Shouldly;
using Xunit;

namespace Tests.XUnit.Tools.MoqSamples;

/// <summary>https://endtoendtester.com/tools/moq</summary>
public class MoqTests
{
    private static readonly Order AnOrder = new("ORD-1", "book-1", 2, new Money(4_000), CustomerTier.Standard);
    private readonly FakeTimeProvider _clock = new(DateTimeOffset.Parse("2026-01-01T12:00:00Z"));

    private static Mock<IInventory> InventoryThatReserves(bool succeeds)
    {
        var inventory = new Mock<IInventory>();
        inventory.Setup(i => i.ReserveAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
                 .ReturnsAsync(succeeds);
        return inventory;
    }

    [Fact]
    public async Task Charges_once_the_stock_is_reserved()
    {
        var gateway = new Mock<IPaymentGateway>();
        gateway.Setup(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(ChargeResult.Ok("pi_1"));

        var outcome = await new Checkout(gateway.Object, InventoryThatReserves(true).Object, _clock).PlaceAsync(AnOrder);

        outcome.ShouldBeOfType<Outcome.Placed>().PaymentIntentId.ShouldBe("pi_1");
    }

    /// <summary>
    /// Capture the argument and assert on it with ordinary matchers: the
    /// failure then names the field that was wrong, rather than saying
    /// "expected an invocation that never happened".
    /// </summary>
    [Fact]
    public async Task Builds_an_idempotency_key_that_is_stable_for_the_day()
    {
        ChargeRequest? captured = null;
        var gateway = new Mock<IPaymentGateway>();
        gateway.Setup(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()))
               .Callback<ChargeRequest, CancellationToken>((request, _) => captured = request)
               .ReturnsAsync(ChargeResult.Ok("pi_1"));

        await new Checkout(gateway.Object, InventoryThatReserves(true).Object, _clock).PlaceAsync(AnOrder);

        captured.ShouldNotBeNull();
        captured!.IdempotencyKey.ShouldBe("ORD-1-2026-01-01");
        captured.Amount.ShouldBe(new Money(4_395));
    }

    [Fact]
    public async Task Never_reaches_the_gateway_when_stock_cannot_be_reserved()
    {
        var gateway = new Mock<IPaymentGateway>();
        var inventory = InventoryThatReserves(false);

        var outcome = await new Checkout(gateway.Object, inventory.Object, _clock).PlaceAsync(AnOrder);

        outcome.ShouldBeOfType<Outcome.OutOfStock>();
        gateway.Verify(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()), Times.Never);
        gateway.VerifyNoOtherCalls();
    }

    /// <summary>
    /// The compensating action has no return value, so verifying the
    /// interaction is legitimate here rather than lazy.
    /// </summary>
    [Fact]
    public async Task Releases_the_reservation_when_the_card_is_declined()
    {
        var gateway = new Mock<IPaymentGateway>();
        gateway.Setup(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(ChargeResult.Declined("card_declined"));
        var inventory = InventoryThatReserves(true);

        var outcome = await new Checkout(gateway.Object, inventory.Object, _clock).PlaceAsync(AnOrder);

        outcome.ShouldBeOfType<Outcome.Declined>().Reason.ShouldBe("card_declined");
        inventory.Verify(i => i.ReleaseAsync("book-1", 2, It.IsAny<CancellationToken>()), Times.Once);
    }

    /// <summary>SetupSequence is how you test a retry without a flaky dependency.</summary>
    [Fact]
    public async Task A_sequence_lets_the_first_call_fail_and_the_second_succeed()
    {
        var gateway = new Mock<IPaymentGateway>();
        gateway.SetupSequence(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync(ChargeResult.Declined("try_again"))
               .ReturnsAsync(ChargeResult.Ok("pi_2"));

        var checkout = new Checkout(gateway.Object, InventoryThatReserves(true).Object, _clock);

        (await checkout.PlaceAsync(AnOrder)).ShouldBeOfType<Outcome.Declined>();
        (await checkout.PlaceAsync(AnOrder)).ShouldBeOfType<Outcome.Placed>();
    }

    [Fact]
    public async Task The_key_changes_when_the_day_does()
    {
        var keys = new List<string>();
        var gateway = new Mock<IPaymentGateway>();
        gateway.Setup(g => g.ChargeAsync(It.IsAny<ChargeRequest>(), It.IsAny<CancellationToken>()))
               .Callback<ChargeRequest, CancellationToken>((request, _) => keys.Add(request.IdempotencyKey))
               .ReturnsAsync(ChargeResult.Ok("pi_1"));
        var checkout = new Checkout(gateway.Object, InventoryThatReserves(true).Object, _clock);

        await checkout.PlaceAsync(AnOrder);
        _clock.Advance(TimeSpan.FromDays(1));
        await checkout.PlaceAsync(AnOrder);

        keys.ShouldBe(["ORD-1-2026-01-01", "ORD-1-2026-01-02"]);
    }
}
