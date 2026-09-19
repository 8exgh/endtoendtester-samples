namespace Shop.Pricing;

/// <summary>
/// Money in minor units. A readonly record struct so equality is by value
/// and a test can assert on it directly.
/// </summary>
public readonly record struct Money(int Cents)
{
    public static Money Zero => new(0);

    public static Money operator +(Money left, Money right) => new(left.Cents + right.Cents);

    public static Money operator *(Money money, int quantity) => new(money.Cents * quantity);

    public override string ToString() => $"£{Cents / 100m:0.00}";
}
