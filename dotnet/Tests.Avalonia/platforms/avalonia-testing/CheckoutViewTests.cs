using Avalonia.Controls;
using Avalonia.Headless.XUnit;
using Avalonia.Threading;
using Shop.Pricing;
using Shouldly;
using Xunit;

namespace Tests.Avalonia.Platforms.AvaloniaTesting;

/// <summary>https://endtoendtester.com/platforms/avalonia-testing</summary>
public class CheckoutViewTests
{
    private static (Window Window, CheckoutView View) Show(CheckoutViewModel viewModel)
    {
        var view = new CheckoutView(viewModel);
        var window = new Window { Width = 320, Height = 480, Content = view };
        window.Show();
        // The Avalonia equivalent of detectChanges or nextTick: drain the
        // queued layout and binding work so an assertion sees settled state.
        Dispatcher.UIThread.RunJobs();
        return (window, view);
    }

    [AvaloniaFact]
    public void Pay_is_disabled_until_a_full_card_number_is_entered()
    {
        var (_, view) = Show(new CheckoutViewModel());

        view.Pay.IsEnabled.ShouldBeFalse();

        view.Card.Text = "4242424242424242";
        Dispatcher.UIThread.RunJobs();

        view.Pay.IsEnabled.ShouldBeTrue();
    }

    [AvaloniaFact]
    public void A_short_card_number_leaves_pay_disabled()
    {
        var (_, view) = Show(new CheckoutViewModel());

        view.Card.Text = "4242";
        Dispatcher.UIThread.RunJobs();

        view.Pay.IsEnabled.ShouldBeFalse();
    }

    [AvaloniaFact]
    public void Clicking_pay_shows_the_confirmation()
    {
        var (_, view) = Show(new CheckoutViewModel());
        view.Card.Text = "4242424242424242";
        Dispatcher.UIThread.RunJobs();

        /* A real click through the real routed-event pipeline. The
           namespace is rooted with `global::` because this assembly's own
           namespace is `Tests.Avalonia`, which otherwise shadows it. */
        view.Pay.RaiseEvent(new global::Avalonia.Interactivity.RoutedEventArgs(Button.ClickEvent));
        Dispatcher.UIThread.RunJobs();

        view.Confirmation.Text.ShouldBe("Order confirmed");
    }

    [AvaloniaFact]
    public void The_total_includes_shipping_below_the_threshold()
    {
        var viewModel = new CheckoutViewModel { UnitCents = 1_200, Quantity = 2 };

        var (_, view) = Show(viewModel);

        viewModel.Total.ShouldBe(new Money(2_795));
        view.TotalText.Text.ShouldBe("£27.95");
    }

    /// <summary>
    /// Layout genuinely runs, so it can be asserted on — which neither
    /// jsdom nor most desktop tooling allows.
    /// </summary>
    [AvaloniaFact]
    public void The_total_stays_inside_the_window_at_a_narrow_width()
    {
        var (window, view) = Show(new CheckoutViewModel());

        var bounds = view.TotalText.Bounds;

        bounds.Width.ShouldBeGreaterThan(0);
        bounds.Height.ShouldBeGreaterThan(0);
        bounds.Right.ShouldBeLessThanOrEqualTo(window.Width);
    }

    /// <summary>
    /// Most of the logic needs no UI at all, which is the point MVVM makes
    /// and the reason the headless tests stay few.
    /// </summary>
    [Fact]
    public void The_view_model_alone_decides_whether_paying_is_possible()
    {
        var viewModel = new CheckoutViewModel();

        viewModel.CanPay.ShouldBeFalse();
        viewModel.CardNumber = "4242424242424242";
        viewModel.CanPay.ShouldBeTrue();
    }

    [Fact]
    public void A_quantity_below_one_is_clamped_rather_than_rejected()
    {
        var viewModel = new CheckoutViewModel { Quantity = -5 };

        viewModel.Quantity.ShouldBe(1);
    }
}
