using Shop.Pricing;
using Shouldly;
using Xunit;

namespace Tests.XUnit.Tools.XUnitSamples;

/// <summary>
/// https://endtoendtester.com/tools/xunit
/// A new instance of this class is constructed for every test, which is
/// xUnit's distinguishing opinion: shared mutable state between tests is
/// impossible by construction rather than merely discouraged.
/// </summary>
public class FactsAndTheoriesTests
{
    private readonly List<string> _touched = [];

    public FactsAndTheoriesTests() => _touched.Add("constructed");

    [Fact]
    public void An_empty_basket_costs_nothing()
    {
        Pricing.Apply(Money.Zero, CustomerTier.Standard, new DiscountPolicy(new Money(10_000), 20))
            .Total.ShouldBe(new Money(395));
    }

    [Theory]
    [InlineData(12_000, 2_400)]
    [InlineData(10_000, 2_000)]  // the boundary: `>=` versus `>` lives here
    [InlineData(9_999, 0)]
    [InlineData(0, 0)]
    public void Discount_applies_at_or_above_the_threshold(int subtotal, int expectedDiscount)
    {
        var priced = Pricing.Apply(new Money(subtotal), CustomerTier.Standard, new DiscountPolicy(new Money(10_000), 20));

        priced.Discount.ShouldBe(new Money(expectedDiscount));
    }

    public static TheoryData<CustomerTier, int, int> ShippingCases => new()
    {
        { CustomerTier.Standard, 1_000, 395 },
        { CustomerTier.Standard, 5_000, 0 },
        { CustomerTier.Gold, 1_000, 0 }
    };

    [Theory]
    [MemberData(nameof(ShippingCases))]
    public void Shipping_depends_on_tier_and_subtotal(CustomerTier tier, int subtotal, int expected)
    {
        Pricing.ShippingFor(new Money(subtotal), tier).ShouldBe(new Money(expected));
    }

    /// <summary>
    /// Two tests, one field, no interference — because each gets its own
    /// instance. In a framework that shares one, this is a real hazard.
    /// </summary>
    [Fact]
    public void Each_test_gets_a_fresh_instance_1() => _touched.Count.ShouldBe(1);

    [Fact]
    public void Each_test_gets_a_fresh_instance_2() => _touched.Count.ShouldBe(1);
}
