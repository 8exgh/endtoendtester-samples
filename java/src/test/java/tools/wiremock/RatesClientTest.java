package tools.wiremock;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.ok;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.options;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.http.Fault;
import java.time.Duration;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import shop.rates.RatesClient;

/**
 * Almost entirely the unhappy paths: they are the ones a real dependency
 * will not produce on request. https://endtoendtester.com/tools/wiremock
 */
class RatesClientTest {

    private WireMockServer wireMock;

    @BeforeEach
    void start() {
        // A dynamic port, always. A fixed one is the most common reason a
        // suite cannot be run in parallel.
        wireMock = new WireMockServer(options().dynamicPort());
        wireMock.start();
    }

    @AfterEach
    void stop() {
        wireMock.stop();
    }

    private RatesClient client(int retries) {
        return new RatesClient(wireMock.baseUrl(), Duration.ofMillis(300), retries);
    }

    @Test
    void parsesASuccessfulResponse() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates"))
                .withQueryParam("base", equalTo("USD"))
                .withHeader("Accept", equalTo("application/json"))
                .willReturn(okJson("{\"base\":\"USD\",\"rates\":{\"GBP\":0.79}}")));

        assertThat(client(0).gbpRate()).isEqualTo(0.79);
    }

    @Test
    void retriesA503AndSucceedsOnTheSecondAttempt() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates")).inScenario("flaky")
                .whenScenarioStateIs(com.github.tomakehurst.wiremock.stubbing.Scenario.STARTED)
                .willReturn(aResponse().withStatus(503))
                .willSetStateTo("recovered"));
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates")).inScenario("flaky")
                .whenScenarioStateIs("recovered")
                .willReturn(okJson("{\"rates\":{\"GBP\":0.79}}")));

        assertThat(client(1).gbpRate()).isEqualTo(0.79);
        wireMock.verify(2, getRequestedFor(urlPathEqualTo("/v1/rates")));
    }

    @Test
    void givesUpAfterTheConfiguredRetries() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates")).willReturn(aResponse().withStatus(503)));

        assertThatThrownBy(() -> client(2).gbpRate())
                .isInstanceOf(RatesClient.RatesUnavailableException.class);

        wireMock.verify(3, getRequestedFor(urlPathEqualTo("/v1/rates")));
    }

    @Test
    void surfacesARateLimitWithItsRetryAfterRatherThanRetrying() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates"))
                .willReturn(aResponse().withStatus(429).withHeader("Retry-After", "120")));

        assertThatThrownBy(() -> client(3).gbpRate())
                .isInstanceOf(RatesClient.RateLimitedException.class)
                .satisfies(e -> assertThat(((RatesClient.RateLimitedException) e).retryAfterSeconds())
                        .isEqualTo(120));

        wireMock.verify(1, getRequestedFor(urlPathEqualTo("/v1/rates")));
    }

    @Test
    void timesOutRatherThanHangingOnASlowResponse() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates"))
                .willReturn(aResponse().withFixedDelay(2_000).withStatus(200)));

        assertThatThrownBy(() -> client(0).gbpRate())
                .isInstanceOf(RatesClient.RatesTimeoutException.class);
    }

    /** Connection-level faults, which no application-level stub can produce. */
    @Test
    void survivesAConnectionResetMidResponse() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates"))
                .willReturn(aResponse().withFault(Fault.CONNECTION_RESET_BY_PEER)));

        assertThatThrownBy(() -> client(0).gbpRate()).isInstanceOf(RuntimeException.class);
    }

    @Test
    void rejectsA200WhoseBodyIsTheWrongShape() {
        wireMock.stubFor(get(urlPathEqualTo("/v1/rates")).willReturn(ok("{\"rates\":{\"USD\":1.0}}")));

        assertThatThrownBy(() -> client(0).gbpRate())
                .isInstanceOf(RatesClient.RatesUnavailableException.class)
                .hasMessageContaining("did not contain a GBP rate");
    }
}
