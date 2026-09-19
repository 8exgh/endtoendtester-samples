package shop.orders;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** The consumer. What it reads out of the response IS the contract. */
public final class OrdersClient {
    private static final Pattern TOTAL = Pattern.compile("\"total_cents\"\\s*:\\s*(\\d+)");
    private static final Pattern CURRENCY = Pattern.compile("\"currency\"\\s*:\\s*\"([A-Z]{3})\"");

    private final String baseUrl;

    public OrdersClient(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public record Order(String id, int totalCents, String currency) {}

    public Order get(String id) {
        try {
            HttpResponse<String> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(baseUrl + "/orders/" + id))
                            .header("Accept", "application/json").build(),
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new IllegalStateException("orders-api returned " + response.statusCode());
            }

            Matcher total = TOTAL.matcher(response.body());
            Matcher currency = CURRENCY.matcher(response.body());
            if (!total.find() || !currency.find()) {
                throw new IllegalStateException("orders-api response did not match the contract");
            }
            return new Order(id, Integer.parseInt(total.group(1)), currency.group(1));
        } catch (IOException | InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }
}
