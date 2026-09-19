package tools.junit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.junit.jupiter.params.provider.Arguments.arguments;

import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import shop.pricing.Money;
import shop.pricing.Pricing;

/** https://endtoendtester.com/tools/junit */
class JupiterFeaturesTest {

    private List<Pricing.Line> basket;

    @BeforeEach
    void setUp() {
        basket = List.of(new Pricing.Line("book-1", 1_200, 2));
    }

    @Test
    @DisplayName("an empty basket costs nothing before shipping")
    void emptyBasketCostsNothing() {
        assertThat(Pricing.subtotal(List.of())).isEqualTo(Money.ZERO);
    }

    @ParameterizedTest(name = "a subtotal of {0} is shipped for {1}")
    @CsvSource({"0, 395", "4999, 395", "5000, 0", "12000, 0"})
    void shippingIsFreeAtOrAboveTheThreshold(int subtotal, int expected) {
        assertThat(Pricing.shippingFor(new Money(subtotal), Pricing.Tier.STANDARD))
                .isEqualTo(new Money(expected));
    }

    @ParameterizedTest
    @EnumSource(Pricing.Tier.class)
    void everyTierHasANonNegativeShippingPrice(Pricing.Tier tier) {
        assertThat(Pricing.shippingFor(new Money(1_000), tier).cents()).isNotNegative();
    }

    static Stream<Arguments> shippingCases() {
        return Stream.of(
                arguments(Pricing.Tier.STANDARD, 1_000, 395),
                arguments(Pricing.Tier.GOLD, 1_000, 0));
    }

    @ParameterizedTest
    @MethodSource("shippingCases")
    void shippingDependsOnTierAndSubtotal(Pricing.Tier tier, int subtotal, int expected) {
        assertThat(Pricing.shippingFor(new Money(subtotal), tier).cents()).isEqualTo(expected);
    }

    /** Nested classes group related cases and share setup, which keeps a
        long test file navigable. */
    @Nested
    @DisplayName("when it holds two books at £12.00")
    class WithTwoBooks {
        @Test
        void totalsEveryLineAtItsOwnQuantity() {
            assertThat(Pricing.subtotal(basket)).isEqualTo(new Money(2_400));
        }

        @Test
        void addsStandardShippingBelowTheThreshold() {
            assertThat(Pricing.total(basket, Pricing.Tier.STANDARD)).isEqualTo(new Money(2_795));
        }

        @Test
        void shipsFreeForAGoldCustomer() {
            assertThat(Pricing.total(basket, Pricing.Tier.GOLD)).isEqualTo(new Money(2_400));
        }
    }

    @Test
    @DisplayName("AssertJ describes a collection by the fields that matter")
    void assertjExtractsTheInterestingFields() {
        List<Pricing.Line> lines =
                List.of(new Pricing.Line("book-1", 1_200, 2), new Pricing.Line("pen-2", 500, 1));

        assertThat(lines)
                .hasSize(2)
                .extracting(Pricing.Line::sku, Pricing.Line::quantity)
                .containsExactlyInAnyOrder(tuple("book-1", 2), tuple("pen-2", 1));
    }

    /** Java's int arithmetic wraps silently, so this is the test that says
        the domain uses exact arithmetic rather than producing a large
        negative total and telling nobody. */
    @Test
    void moneyOverflowsLoudlyRatherThanWrappingAround() {
        assertThatThrownBy(() -> new Money(Integer.MAX_VALUE).plus(new Money(1)))
                .isInstanceOf(ArithmeticException.class)
                .hasMessageContaining("overflow");

        assertThatThrownBy(() -> new Money(Integer.MAX_VALUE).times(2))
                .isInstanceOf(ArithmeticException.class);
    }

    @Test
    void ordinaryAmountsAreUnaffectedByTheExactArithmetic() {
        assertThat(new Money(1_999).plus(new Money(1))).isEqualTo(new Money(2_000));
        assertThat(new Money(333).times(3)).isEqualTo(new Money(999));
    }
}
