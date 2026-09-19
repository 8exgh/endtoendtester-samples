using Microsoft.VisualStudio.TestTools.UnitTesting;
using Shop.Pricing;

namespace Tests.MSTest.Tools.MSTestSamples;

/// <summary>https://endtoendtester.com/tools/mstest</summary>
[TestClass]
public class DataRowTests
{
    private DiscountPolicy _policy = null!;

    // TestInitialize, not a constructor: MSTest does not guarantee an
    // instance per test the way xUnit does.
    [TestInitialize]
    public void Setup() => _policy = new DiscountPolicy(new Money(10_000), 20);

    [TestMethod]
    public void An_empty_basket_is_discounted_by_nothing()
    {
        Assert.AreEqual(0, Pricing.Apply(Money.Zero, CustomerTier.Standard, _policy).Discount.Cents);
    }

    [TestMethod]
    [DataRow(12_000, 2_400)]
    [DataRow(10_000, 2_000)]
    [DataRow(9_999, 0)]
    public void Discount_applies_at_or_above_the_threshold(int subtotal, int expected)
    {
        Assert.AreEqual(expected, Pricing.Apply(new Money(subtotal), CustomerTier.Standard, _policy).Discount.Cents);
    }

    public static IEnumerable<object[]> ShippingCases()
    {
        yield return [CustomerTier.Standard, 1_000, 395];
        yield return [CustomerTier.Standard, 5_000, 0];
        yield return [CustomerTier.Gold, 1_000, 0];
    }

    [TestMethod]
    [DynamicData(nameof(ShippingCases), DynamicDataSourceType.Method)]
    public void Shipping_depends_on_tier_and_subtotal(CustomerTier tier, int subtotal, int expected)
    {
        Assert.AreEqual(expected, Pricing.ShippingFor(new Money(subtotal), tier).Cents);
    }

    [TestMethod]
    public void Throwing_is_asserted_with_a_dedicated_method()
    {
        Assert.ThrowsException<InvalidOperationException>(() => throw new InvalidOperationException("no"));
    }

    [TestMethod]
    public void Collections_have_their_own_assertion_class()
    {
        int[] expected = [395, 0];
        int[] actual =
        [
            Pricing.ShippingFor(new Money(1_000), CustomerTier.Standard).Cents,
            Pricing.ShippingFor(new Money(5_000), CustomerTier.Standard).Cents
        ];

        CollectionAssert.AreEqual(expected, actual);
    }
}
