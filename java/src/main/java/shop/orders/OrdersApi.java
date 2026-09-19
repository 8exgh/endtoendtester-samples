package shop.orders;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The provider. A real HTTP server on an ephemeral port, so the contract is
 * verified against something that actually serves requests rather than
 * against a description of one.
 * https://endtoendtester.com/testing-levels/contract-testing
 */
public final class OrdersApi implements AutoCloseable {
    private final HttpServer server;
    private final Map<String, String> orders = new LinkedHashMap<>();

    public OrdersApi() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/orders", exchange -> {
            String path = exchange.getRequestURI().getPath();
            String id = path.substring(path.lastIndexOf('/') + 1);
            String body = orders.get(id);

            if (body == null) {
                respond(exchange, 404, "{\"error\":\"not_found\"}");
                return;
            }
            respond(exchange, 200, body);
        });
        server.start();
    }

    /** The provider state a consumer's expectation names. */
    public void given(String orderId, int totalCents, String currency) {
        orders.put(orderId, "{\"id\":\"%s\",\"total_cents\":%d,\"currency\":\"%s\",\"status\":\"paid\"}"
                .formatted(orderId, totalCents, currency));
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private static void respond(com.sun.net.httpserver.HttpExchange exchange, int status, String body)
            throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
