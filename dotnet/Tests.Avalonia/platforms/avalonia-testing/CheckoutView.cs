using Avalonia.Controls;
using Avalonia.Layout;
using Shop.Pricing;

namespace Tests.Avalonia.Platforms.AvaloniaTesting;

/// <summary>
/// A view model with the rules, and a view that binds to it. Built in code
/// rather than XAML so the sample is one file — the testing story is
/// identical either way.
/// </summary>
public sealed class CheckoutViewModel
{
    private int _quantity = 1;

    public int UnitCents { get; init; } = 1_200;
    public CustomerTier Tier { get; init; } = CustomerTier.Standard;

    public int Quantity
    {
        get => _quantity;
        set => _quantity = value < 1 ? 1 : value;
    }

    public Money Subtotal => new Money(UnitCents) * Quantity;
    public Money Shipping => Pricing.ShippingFor(Subtotal, Tier);
    public Money Total => Subtotal + Shipping;

    public bool CanPay => Quantity >= 1 && CardNumber.Length == 16;
    public string CardNumber { get; set; } = string.Empty;
}

public sealed class CheckoutView : UserControl
{
    public TextBlock TotalText { get; }
    public TextBox Card { get; }
    public Button Pay { get; }
    public TextBlock Confirmation { get; }

    public CheckoutView(CheckoutViewModel viewModel)
    {
        DataContext = viewModel;

        TotalText = new TextBlock { Name = "Total", Text = viewModel.Total.ToString() };
        Card = new TextBox { Name = "CardNumber", Watermark = "Card number" };
        Pay = new Button { Name = "Pay", Content = "Pay", IsEnabled = viewModel.CanPay };
        Confirmation = new TextBlock { Name = "Confirmation", Text = string.Empty };

        Card.TextChanged += (_, _) =>
        {
            viewModel.CardNumber = Card.Text ?? string.Empty;
            Pay.IsEnabled = viewModel.CanPay;
        };

        Pay.Click += (_, _) => Confirmation.Text = "Order confirmed";

        Content = new StackPanel
        {
            Orientation = Orientation.Vertical,
            Width = 300,
            Children = { TotalText, Card, Pay, Confirmation }
        };
    }
}
