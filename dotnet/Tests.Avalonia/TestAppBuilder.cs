using Avalonia;
using Avalonia.Headless;
using Avalonia.Themes.Fluent;

[assembly: AvaloniaTestApplication(typeof(Tests.Avalonia.TestAppBuilder))]

namespace Tests.Avalonia;

/// <summary>
/// The headless platform runs Avalonia's full UI stack — layout, styling,
/// binding, input — with no windowing system at all. That is what makes
/// real desktop UI tests runnable in an ordinary Linux CI container, in
/// milliseconds. https://endtoendtester.com/platforms/avalonia-testing
/// </summary>
public static class TestAppBuilder
{
    public static AppBuilder BuildAvaloniaApp() => AppBuilder
        .Configure<TestApp>()
        .UseHeadless(new AvaloniaHeadlessPlatformOptions
        {
            // true keeps the run lighter; set false (with Avalonia.Skia)
            // when you want CaptureRenderedFrame for visual regression.
            UseHeadlessDrawing = true
        });
}

public class TestApp : Application
{
    public override void Initialize() => Styles.Add(new FluentTheme());
}
