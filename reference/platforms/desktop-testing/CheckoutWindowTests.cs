using FlaUI.Core;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Tools;
using FlaUI.UIA3;
using Xunit;

namespace Reference.Desktop;

/// <summary>
/// FlaUI against a WPF or WinUI application, through Windows UI Automation.
///
/// NOT run in CI: FlaUI targets net8.0-windows and needs a real desktop
/// session. It is here because the article is about what desktop
/// automation actually looks like, and stubbing it into something that
/// passed on Linux would prove nothing.
///
/// For a .NET desktop stack whose UI tests DO run on a Linux runner, see
/// dotnet/Tests.Avalonia in this repository.
///
/// https://endtoendtester.com/platforms/desktop-testing
/// </summary>
public class CheckoutWindowTests : IDisposable
{
    private readonly Application _app;
    private readonly UIA3Automation _automation = new();
    private readonly Window _window;

    public CheckoutWindowTests()
    {
        _app = Application.Launch("bin/Release/net8.0-windows/Shop.exe");
        _window = _app.GetMainWindow(_automation, TimeSpan.FromSeconds(30));
    }

    [Fact]
    public void Paying_shows_a_confirmation()
    {
        // AutomationId is the desktop equivalent of a test id, set in XAML:
        //   <Button AutomationProperties.AutomationId="Pay" .../>
        // Without it you match on control type and position, which breaks
        // on every layout change.
        _window.FindFirstDescendant(cf => cf.ByAutomationId("CardNumber"))
               .AsTextBox().Text = "4242424242424242";

        _window.FindFirstDescendant(cf => cf.ByAutomationId("Pay")).AsButton().Invoke();

        /* Nothing waits for you. Retry IS the waiting model, and the
           quality of this helper largely decides how flaky the suite is —
           it is the code Playwright supplies for free on the web. */
        var confirmation = Retry.WhileNull(
            () => _window.FindFirstDescendant(cf => cf.ByAutomationId("Confirmation")),
            timeout: TimeSpan.FromSeconds(10)).Result;

        Assert.Equal("Order confirmed", confirmation.AsLabel().Text);
    }

    [Fact]
    public void Pay_is_disabled_until_a_card_is_entered()
    {
        var pay = _window.FindFirstDescendant(cf => cf.ByAutomationId("Pay")).AsButton();

        Assert.False(pay.IsEnabled);

        _window.FindFirstDescendant(cf => cf.ByAutomationId("CardNumber"))
               .AsTextBox().Text = "4242424242424242";

        Retry.WhileFalse(() => pay.IsEnabled, timeout: TimeSpan.FromSeconds(5));
        Assert.True(pay.IsEnabled);
    }

    public void Dispose()
    {
        _app.Close();
        _automation.Dispose();
        GC.SuppressFinalize(this);
    }
}
