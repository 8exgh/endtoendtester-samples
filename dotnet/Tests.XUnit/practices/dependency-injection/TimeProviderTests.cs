using Microsoft.Extensions.Time.Testing;
using Shouldly;
using Xunit;

namespace Tests.XUnit.Practices.DependencyInjection;

/// <summary>
/// .NET 8 added TimeProvider, which removed the last common excuse for
/// untestable time-dependent code.
/// https://endtoendtester.com/practices/dependency-injection
/// </summary>
public class TimeProviderTests
{
    private sealed record Token(DateTimeOffset ExpiresAt);

    private sealed class TokenService(TimeProvider clock)
    {
        public Token Issue(TimeSpan ttl) => new(clock.GetUtcNow() + ttl);

        // Inclusive: a token is dead at the instant it expires.
        public bool IsExpired(Token token) => token.ExpiresAt <= clock.GetUtcNow();
    }

    [Fact]
    public void A_token_is_expired_at_exactly_its_expiry_instant()
    {
        var clock = new FakeTimeProvider(DateTimeOffset.Parse("2026-01-01T12:00:00Z"));
        var service = new TokenService(clock);
        var token = service.Issue(TimeSpan.FromHours(1));

        clock.Advance(TimeSpan.FromHours(1));

        service.IsExpired(token).ShouldBeTrue();
    }

    [Fact]
    public void And_alive_one_tick_earlier()
    {
        var clock = new FakeTimeProvider(DateTimeOffset.Parse("2026-01-01T12:00:00Z"));
        var service = new TokenService(clock);
        var token = service.Issue(TimeSpan.FromHours(1));

        clock.Advance(TimeSpan.FromHours(1) - TimeSpan.FromMilliseconds(1));

        service.IsExpired(token).ShouldBeFalse();
    }

    /// <summary>
    /// The cases that quietly break in production and cannot be reached at
    /// all with a real clock.
    /// </summary>
    [Theory]
    [InlineData("2026-01-31T23:59:59Z")]  // a month end
    [InlineData("2028-02-29T12:00:00Z")]  // a leap day
    [InlineData("2026-03-29T01:30:00Z")]  // a DST transition in Europe/London
    public void Expiry_is_decidable_at_every_awkward_instant(string instant)
    {
        var clock = new FakeTimeProvider(DateTimeOffset.Parse(instant));
        var service = new TokenService(clock);

        var token = service.Issue(TimeSpan.FromMinutes(1));

        service.IsExpired(token).ShouldBeFalse();
        clock.Advance(TimeSpan.FromMinutes(1));
        service.IsExpired(token).ShouldBeTrue();
    }

    /// <summary>
    /// FakeTimeProvider also drives Task.Delay, so retry and backoff logic
    /// is testable with no real waiting at all.
    /// </summary>
    [Fact]
    public async Task A_delay_completes_the_moment_the_fake_clock_advances()
    {
        var clock = new FakeTimeProvider();
        var waited = Task.Delay(TimeSpan.FromMinutes(5), clock);

        waited.IsCompleted.ShouldBeFalse();
        clock.Advance(TimeSpan.FromMinutes(5));

        await waited; // returns immediately; no five minutes were spent
        waited.IsCompletedSuccessfully.ShouldBeTrue();
    }
}
