using NUnit.Framework;
using Shop.Pricing;

namespace Tests.NUnit.Tools.NUnitSamples;

/// <summary>https://endtoendtester.com/tools/nunit</summary>
[TestFixture]
public class ConstraintModelTests
{
    private DiscountPolicy _policy = null!;

    /// <summary>
    /// One instance serves every test in this fixture, so state must be
    /// built here rather than in a field initialiser. That is NUnit's
    /// central difference from xUnit.
    /// </summary>
    [SetUp]
    public void SetUp() => _policy = new DiscountPolicy(new Money(10_000), 20);

    [Test]
    public void An_empty_subtotal_is_discounted_by_nothing()
    {
        Assert.That(Pricing.Apply(Money.Zero, CustomerTier.Standard, _policy).Discount,
            Is.EqualTo(Money.Zero));
    }

    /// <summary>ExpectedResult keeps arrange-act-assert to two lines.</summary>
    [TestCase(12_000, ExpectedResult = 2_400)]
    [TestCase(10_000, ExpectedResult = 2_000)]
    [TestCase(9_999, ExpectedResult = 0)]
    public int Discount_applies_at_or_above_the_threshold(int subtotal) =>
        Pricing.Apply(new Money(subtotal), CustomerTier.Standard, _policy).Discount.Cents;

    /// <summary>
    /// Assert.Multiple reports every failure rather than only the first —
    /// genuinely useful, and without a direct xUnit equivalent.
    /// </summary>
    [Test]
    public void Reports_every_wrong_facet_of_one_outcome_at_once()
    {
        var priced = Pricing.Apply(new Money(12_000), CustomerTier.Standard, _policy);

        Assert.Multiple(() =>
        {
            Assert.That(priced.Subtotal.Cents, Is.EqualTo(12_000));
            Assert.That(priced.Discount.Cents, Is.EqualTo(2_400));
            Assert.That(priced.Shipping.Cents, Is.Zero);
            Assert.That(priced.Total.Cents, Is.EqualTo(9_600));
        });
    }

    /// <summary>The cartesian product: six tests from five values.</summary>
    [Test]
    public void Shipping_is_priced_for_every_tier_and_subtotal(
        [Values(CustomerTier.Standard, CustomerTier.Gold)] CustomerTier tier,
        [Values(0, 4_999, 5_000)] int subtotal)
    {
        Assert.That(Pricing.ShippingFor(new Money(subtotal), tier).Cents, Is.InRange(0, 395));
    }

    /// <summary>A hundred random values, which is property testing in miniature.</summary>
    [Test]
    public void A_discount_is_never_larger_than_the_subtotal(
        [Random(0, 1_000_000, 100)] int subtotal)
    {
        var priced = Pricing.Apply(new Money(subtotal), CustomerTier.Standard, _policy);

        Assert.That(priced.Discount.Cents, Is.InRange(0, subtotal));
    }

    [Test]
    public void Throws_is_a_constraint_like_any_other()
    {
        Assert.That(() => throw new InvalidOperationException("no"), Throws.TypeOf<InvalidOperationException>());
    }
}
