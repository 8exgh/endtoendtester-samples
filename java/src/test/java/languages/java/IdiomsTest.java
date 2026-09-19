package languages.java;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.IntStream;
import org.assertj.core.api.SoftAssertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import shop.pricing.Money;
import shop.pricing.Pricing;

/** https://endtoendtester.com/languages/java */
@ExtendWith(MockitoExtension.class)
class IdiomsTest {

    interface Mailer {
        void send(String to, String subject);
    }

    @Mock
    Mailer mailer;

    @Captor
    ArgumentCaptor<String> subject;

    record Token(Instant expiresAt) {}

    static final class TokenService {
        private final Clock clock;

        TokenService(Clock clock) {
            this.clock = clock;
        }

        boolean isExpired(Token token) {
            return !token.expiresAt().isAfter(clock.instant());
        }
    }

    /** java.time.Clock is in the standard library precisely for this. */
    @Test
    void aTokenIsExpiredAtExactlyItsExpiryInstant() {
        Instant at = Instant.parse("2026-01-01T13:00:00Z");
        TokenService service = new TokenService(Clock.fixed(at, ZoneOffset.UTC));

        assertThat(service.isExpired(new Token(at))).isTrue();
        assertThat(service.isExpired(new Token(at.plusSeconds(1)))).isFalse();
    }

    /**
     * ArgumentCaptor with an ordinary assertion beats a complicated matcher:
     * the failure names the value that was wrong rather than saying
     * "wanted but not invoked".
     */
    @Test
    void capturingTheArgumentGivesAReadableFailure() {
        notify(mailer, new Money(2_795));

        org.mockito.Mockito.verify(mailer).send(org.mockito.ArgumentMatchers.eq("a@example.test"), subject.capture());
        assertThat(subject.getValue()).isEqualTo("Your order comes to £27.95");
    }

    private static void notify(Mailer mailer, Money total) {
        mailer.send("a@example.test", "Your order comes to " + total);
    }

    /** Soft assertions report every wrong facet of one outcome at once. */
    @Test
    void softAssertionsReportEveryFailureNotOnlyTheFirst() {
        List<Pricing.Line> basket = List.of(new Pricing.Line("book-1", 1_200, 2));

        SoftAssertions.assertSoftly(softly -> {
            softly.assertThat(Pricing.subtotal(basket)).isEqualTo(new Money(2_400));
            softly.assertThat(Pricing.shippingFor(new Money(2_400), Pricing.Tier.STANDARD))
                    .isEqualTo(new Money(395));
            softly.assertThat(Pricing.total(basket, Pricing.Tier.GOLD)).isEqualTo(new Money(2_400));
        });
    }

    @Test
    void concurrentWorkIsAssertedWithoutASleep() {
        AtomicInteger reserved = new AtomicInteger();

        IntStream.range(0, 100).parallel().forEach(i -> reserved.incrementAndGet());

        assertThat(reserved).hasValue(100);
    }

    @Test
    void recordsGiveValueEqualitySoAWholeResultCanBeAsserted() {
        assertThat(new Pricing.Line("book-1", 1_200, 2))
                .isEqualTo(new Pricing.Line("book-1", 1_200, 2));
    }

    @Test
    void anExceptionIsAssertedByTypeAndMessage() {
        assertThatThrownBy(() -> new Money(Integer.MAX_VALUE).times(2))
                .isInstanceOf(ArithmeticException.class);
    }
}
