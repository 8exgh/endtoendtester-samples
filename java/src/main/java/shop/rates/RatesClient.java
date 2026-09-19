package shop.rates;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The client a stub is put in front of. Its timeout, retry and error
 * mapping all run for real against a programmable server — which is what
 * separates this from mocking the client itself.
 * https://endtoendtester.com/tools/wiremock
 */
public final class RatesClient {
    private static final Pattern GBP = Pattern.compile("\"GBP\"\\s*:\\s*([0-9.]+)");

    private final String baseUrl;
    private final int retries;
    private final HttpClient http;

    public RatesClient(String baseUrl, Duration timeout, int retries) {
        this.baseUrl = baseUrl;
        this.retries = retries;
        this.http = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    public double gbpRate() {
        RuntimeException last = new RatesUnavailableException("never attempted");

        for (int attempt = 0; attempt <= retries; attempt++) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + "/v1/rates?base=USD"))
                        .header("Accept", "application/json")
                        .timeout(Duration.ofMillis(500))
                        .build();
                HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() == 429) {
                    // Not retried: the server said how long to wait.
                    throw new RateLimitedException(
                            Integer.parseInt(response.headers().firstValue("retry-after").orElse("60")));
                }
                if (response.statusCode() != 200) {
                    last = new RatesUnavailableException("upstream returned " + response.statusCode());
                    continue;
                }

                Matcher matcher = GBP.matcher(response.body());
                if (!matcher.find()) {
                    throw new RatesUnavailableException("response did not contain a GBP rate");
                }
                return Double.parseDouble(matcher.group(1));
            } catch (RateLimitedException e) {
                throw e;
            } catch (IOException | InterruptedException e) {
                last = new RatesTimeoutException(e.getMessage() == null ? "no response" : e.getMessage());
            }
        }

        throw last;
    }

    public static class RatesUnavailableException extends RuntimeException {
        public RatesUnavailableException(String message) {
            super(message);
        }
    }

    public static class RatesTimeoutException extends RuntimeException {
        public RatesTimeoutException(String message) {
            super(message);
        }
    }

    public static class RateLimitedException extends RuntimeException {
        private final int retryAfterSeconds;

        public RateLimitedException(int retryAfterSeconds) {
            super("rate limited for " + retryAfterSeconds + "s");
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public int retryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
