# frozen_string_literal: true

require 'basket'

# Shared examples are the cleanest expression of contract testing in any
# framework covered here: one suite, run against every implementation, so a
# simplified one cannot silently drift from the real one.
# https://endtoendtester.com/tools/rspec
RSpec.shared_examples 'an order repository' do
  it 'saves an order and reads it back' do
    repository.save('REF-1', 1_999)

    expect(repository.find('REF-1')).to eq(1_999)
  end

  it 'returns nothing for a reference it has never seen' do
    expect(repository.find('REF-missing')).to be_nil
  end

  it 'rejects a duplicate reference' do
    repository.save('REF-1', 1_999)

    expect { repository.save('REF-1', 2_999) }.to raise_error(Shop::DuplicateReference, /REF-1/)
  end
end

RSpec.describe Shop::InMemoryOrderRepository do
  let(:repository) { described_class.new }

  it_behaves_like 'an order repository'
end

RSpec.describe Shop::PrefixedOrderRepository do
  let(:repository) { described_class.new(Shop::InMemoryOrderRepository.new, 'tenant-a:') }

  it_behaves_like 'an order repository'

  it 'keeps two tenants from colliding on the same reference' do
    inner = Shop::InMemoryOrderRepository.new
    a = described_class.new(inner, 'tenant-a:')
    b = described_class.new(inner, 'tenant-b:')

    a.save('REF-1', 100)

    expect { b.save('REF-1', 200) }.not_to raise_error
  end
end

RSpec.describe 'verifying doubles' do
  it 'refuses to stub a method the real class does not have' do
    repository = instance_double(Shop::InMemoryOrderRepository)

    expect { allow(repository).to receive(:sav) }
      .to raise_error(RSpec::Mocks::MockExpectationError, /does not implement/)
  end

  it 'allows a method it does have, and records the call' do
    repository = instance_double(Shop::InMemoryOrderRepository, save: true)

    repository.save('REF-1', 100)

    expect(repository).to have_received(:save).with('REF-1', 100)
  end
end
