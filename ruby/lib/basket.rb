# frozen_string_literal: true

# https://endtoendtester.com/tools/rspec
module Shop
  FREE_SHIPPING_THRESHOLD_CENTS = 5_000
  STANDARD_SHIPPING_CENTS = 395

  Line = Struct.new(:sku, :unit_cents, :quantity, keyword_init: true) do
    def total_cents
      unit_cents * quantity
    end
  end

  class DuplicateReference < StandardError; end

  # A discount policy, so the specs have something with real behaviour to
  # exercise rather than a stub that agrees with them.
  class DiscountPolicy
    attr_reader :code

    def self.percent_over(code, percent, threshold_cents:)
      new(code, :percent, percent, threshold_cents)
    end

    def self.fixed(code, cents)
      new(code, :fixed, cents, 0)
    end

    def initialize(code, kind, value, threshold_cents)
      @code = code
      @kind = kind
      @value = value
      @threshold_cents = threshold_cents
    end

    def discount_for(subtotal_cents)
      return 0 if subtotal_cents < @threshold_cents

      raw = @kind == :percent ? (subtotal_cents * @value / 100.0).round : @value
      [raw, subtotal_cents].min
    end
  end

  class Basket
    attr_reader :lines

    def initialize(lines = [])
      @lines = lines
    end

    def add(sku:, unit_cents:, quantity: 1)
      @lines << Line.new(sku: sku, unit_cents: unit_cents, quantity: quantity)
      self
    end

    def subtotal_cents
      @lines.sum(&:total_cents)
    end

    def shipping_cents(tier: :standard)
      return 0 if tier == :gold || subtotal_cents >= FREE_SHIPPING_THRESHOLD_CENTS

      STANDARD_SHIPPING_CENTS
    end

    # The best single discount, never two.
    def total_with(policies, tier: :standard)
      best = policies.map { |policy| [policy.code, policy.discount_for(subtotal_cents)] }
                     .reject { |(_, cents)| cents.zero? }
                     .max_by { |(_, cents)| cents }

      discount = best ? best[1] : 0
      {
        subtotal_cents: subtotal_cents,
        discount_cents: discount,
        applied_code: best&.first,
        payable_cents: subtotal_cents - discount + shipping_cents(tier: tier)
      }
    end
  end

  # Two implementations of one contract, so a shared example group can hold
  # them both to it.
  class InMemoryOrderRepository
    def initialize = @rows = {}

    def save(reference, amount_cents)
      raise DuplicateReference, reference if @rows.key?(reference)

      @rows[reference] = amount_cents
    end

    def find(reference) = @rows[reference]
  end

  class PrefixedOrderRepository
    def initialize(inner, prefix) = (@inner, @prefix = inner, prefix)

    def save(reference, amount_cents) = @inner.save("#{@prefix}#{reference}", amount_cents)

    def find(reference) = @inner.find("#{@prefix}#{reference}")
  end
end
