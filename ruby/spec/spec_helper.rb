# frozen_string_literal: true

$LOAD_PATH.unshift File.expand_path('../lib', __dir__)

RSpec.configure do |config|
  # `RSpec.describe`, not a bare `describe`: the monkey patch is convenient
  # and makes it unclear where `describe` came from.
  config.disable_monkey_patching!

  # Surfaces order dependence, which is the bug parallelism would otherwise
  # find for you later and more expensively.
  config.order = :random
  Kernel.srand config.seed

  config.filter_run_when_matching :focus
  config.example_status_persistence_file_path = '.rspec_status'

  config.expect_with(:rspec) { |c| c.syntax = :expect }

  # A plain `double` will happily stub a method that does not exist, which
  # is a green test for code that cannot work.
  config.mock_with(:rspec) { |c| c.verify_partial_doubles = true }
end
