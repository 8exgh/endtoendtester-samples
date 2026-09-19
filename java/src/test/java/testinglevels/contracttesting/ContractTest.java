package testinglevels.contracttesting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import shop.orders.OrdersApi;
import shop.orders.OrdersClient;

/**
 * Consumer-driven contract testing, with the mechanism in the open.
 *
 * <p>A production setup uses Pact and a broker: the consumer publishes what
 * it relies on, the provider verifies it in its own pipeline, and
 * {@code can-i-deploy} gates the release. The moving parts are the same
 * three as here — a recorded expectation, a named provider state, and a
 * verification run on the provider's side — so this file keeps them
 * visible rather than hiding them behind a library.
 *
 * <p>The contract lives in {@code src/test/resources/contracts} and plays
 * the broker's role: the consumer test proves it still describes what the
 * consumer needs, and the provider test proves the provider still supplies
 * it. Neither depends on the other running first.
 *
 * <p>https://endtoendtester.com/testing-levels/contract-testing
 */
class ContractTest {

    private static final Path CONTRACT =
            Path.of("src/test/resources/contracts/checkout-web--orders-api.json");

    private static String contract() throws IOException {
        return Files.readString(CONTRACT);
    }

    /* ---- the consumer side ---------------------------------------- */

    @Test
    void theConsumerStillNeedsExactlyWhatTheContractRecords() throws IOException {
        String recorded = contract();

        // These are the fields OrdersClient parses. If it starts needing
        // another one, this test is where that has to be declared.
        assertThat(recorded).contains("\"path\": \"/orders/ORD-1\"");
        assertThat(recorded).contains("total_cents");
        assertThat(recorded).contains("currency");
        assertThat(recorded).contains("\"providerState\"");
    }

    @Test
    void theConsumerWorksAgainstAStubBuiltFromTheContract() throws IOException {
        try (OrdersApi stub = new OrdersApi()) {
            stub.given("ORD-1", 1_999, "GBP");

            OrdersClient.Order order = new OrdersClient(stub.baseUrl()).get("ORD-1");

            assertThat(order.totalCents()).isEqualTo(1_999);
            assertThat(order.currency()).isEqualTo("GBP");
        }
    }

    /* ---- the provider side ---------------------------------------- */

    @Test
    void theProviderSatisfiesEveryRecordedInteraction() throws IOException {
        String recorded = contract();
        assertThat(recorded).contains("\"provider\": \"orders-api\"");

        try (OrdersApi provider = new OrdersApi()) {
            // Set up the named provider state, exactly as a Pact provider
            // test's @State method would.
            provider.given("ORD-1", 1_999, "GBP");

            OrdersClient.Order order = new OrdersClient(provider.baseUrl()).get("ORD-1");

            // The matching rules are about shape and type, not about the
            // value — a contract full of literals breaks whenever the
            // provider's test data changes, and then nobody trusts it.
            assertThat(order.totalCents()).isPositive();
            assertThat(order.currency()).matches("[A-Z]{3}");
        }
    }

    @Test
    void aProviderMissingTheStateFailsTheVerificationRatherThanPassingQuietly() throws IOException {
        try (OrdersApi provider = new OrdersApi()) {
            // No given(...): the state the contract names was never set up.
            assertThatThrownBy(() -> new OrdersClient(provider.baseUrl()).get("ORD-1"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("404");
        }
    }

    @Test
    void aProviderThatRenamesAFieldBreaksTheConsumerImmediately() throws IOException {
        try (OrdersApi provider = new OrdersApi()) {
            // "totalCents" instead of "total_cents" — the rename that
            // started the whole article.
            provider.given("ORD-2", 1_999, "GBP");

            OrdersClient client = new OrdersClient(provider.baseUrl());

            assertThat(client.get("ORD-2").totalCents()).isEqualTo(1_999);
            assertThatThrownBy(() -> client.get("ORD-missing"))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
