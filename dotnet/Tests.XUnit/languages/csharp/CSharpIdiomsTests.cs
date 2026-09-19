using Shop.Ordering;
using Shop.Pricing;
using Shouldly;
using Xunit;

namespace Tests.XUnit.Languages.CSharpSamples;

/// <summary>https://endtoendtester.com/languages/csharp</summary>
public class CSharpIdiomsTests
{
    /// <summary>
    /// Records give value equality, so an assertion can be about the whole
    /// result rather than five properties.
    /// </summary>
    [Fact]
    public void A_record_result_can_be_asserted_whole()
    {
        var priced = Pricing.Apply(new Money(12_000), CustomerTier.Standard, new DiscountPolicy(new Money(10_000), 20));

        priced.ShouldBe(new Priced(new Money(12_000), new Money(2_400), Money.Zero));
    }

    /// <summary>
    /// A closed hierarchy of outcomes turns "did it work" into a value the
    /// compiler helps you exhaust, rather than an exception to catch.
    /// </summary>
    [Fact]
    public void An_outcome_hierarchy_narrows_in_a_switch()
    {
        Outcome outcome = new Outcome.Declined("card_declined");

        var message = outcome switch
        {
            Outcome.Placed placed => $"paid {placed.Total}",
            Outcome.OutOfStock stock => $"no {stock.Sku}",
            Outcome.Declined declined => $"declined: {declined.Reason}",
            _ => throw new UnreachableException()
        };

        message.ShouldBe("declined: card_declined");
    }

    [Fact]
    public void Money_formats_in_minor_units_without_floating_point()
    {
        (new Money(1_999) + new Money(1)).ToString().ShouldBe("£20.00");
        (new Money(333) * 3).ShouldBe(new Money(999));
    }

    [Fact]
    public async Task Concurrent_work_is_asserted_with_WhenAll_rather_than_a_sleep()
    {
        var reserved = 0;
        var inventory = new CountingInventory(() => Interlocked.Increment(ref reserved));

        await Task.WhenAll(Enumerable.Range(0, 20).Select(_ => inventory.ReserveAsync("book-1", 1)));

        reserved.ShouldBe(20);
    }

    private sealed class CountingInventory(Action onReserve) : IInventory
    {
        public Task<bool> ReserveAsync(string sku, int quantity, CancellationToken cancellationToken = default)
        {
            onReserve();
            return Task.FromResult(true);
        }

        public Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    [Fact]
    public void Shouldly_reports_the_expression_that_failed_not_just_the_values()
    {
        var error = Should.Throw<ShouldAssertException>(() => new Money(1).ShouldBe(new Money(2)));

        error.Message.ShouldContain("Money");
    }
}

internal sealed class UnreachableException() : Exception("unreachable");
