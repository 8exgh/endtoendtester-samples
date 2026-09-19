# frozen_string_literal: true

require 'basket'

# https://endtoendtester.com/tools/rspec
RSpec.describe Shop::Basket do
  subject(:basket) { described_class.new }

  it 'costs nothing when it holds nothing' do
    expect(basket.subtotal_cents).to eq(0)
  end

  context 'with two books at £12.00' do
    before { basket.add(sku: 'book-1', unit_cents: 1_200, quantity: 2) }

    it 'totals every line at its own quantity' do
      expect(basket.subtotal_cents).to eq(2_400)
    end

    it 'charges standard shipping below the threshold' do
      expect(basket.shipping_cents).to eq(395)
    end

    it 'ships a gold customer for free regardless of the subtotal' do
      expect(basket.shipping_cents(tier: :gold)).to eq(0)
    end
  end

  context 'at exactly the free-shipping threshold' do
    before { basket.add(sku: 'desk-3', unit_cents: 5_000) }

    it 'ships free, which is where >= versus > is decided' do
      expect(basket.shipping_cents).to eq(0)
    end
  end

  describe 'discount selection' do
    # `let` is lazy and memoised per example, and overriding it in a nested
    # context is the mechanism that removes the duplication.
    let(:policies) do
      [
        Shop::DiscountPolicy.percent_over('SUMMER', 10, threshold_cents: 5_000),
        Shop::DiscountPolicy.fixed('WELCOME', 1_500)
      ]
    end

    before { basket.add(sku: 'book-1', unit_cents: 2_000, quantity: 3) }

    it 'applies the best single discount, never two' do
      result = basket.total_with(policies)

      expect(result).to include(discount_cents: 1_500, applied_code: 'WELCOME')
    end

    context 'when the basket is large enough for the percentage to win' do
      before { basket.add(sku: 'desk-3', unit_cents: 40_000) }

      it 'prefers the percentage' do
        expect(basket.total_with(policies)).to include(applied_code: 'SUMMER')
      end
    end
  end

  describe 'matchers worth knowing' do
    it 'changes the subtotal by exactly the line it added' do
      expect { basket.add(sku: 'pen-2', unit_cents: 500, quantity: 2) }
        .to change(basket, :subtotal_cents).by(1_000)
    end

    it 'never discounts below zero' do
      basket.add(sku: 'pen-2', unit_cents: 500)

      expect(basket.total_with([Shop::DiscountPolicy.fixed('GENEROUS', 10_000)]))
        .to include(payable_cents: a_value >= 0)
    end
  end
end
