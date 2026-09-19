# The scenarios a three-amigos session produced. The third one is the
# valuable one, and it exists only because somebody asked in the room.
# https://endtoendtester.com/practices/behavior-driven-development
Feature: Shipping charges

  Subscribers get free shipping. Everybody else pays £3.95.

  Scenario: An active subscriber gets free shipping
    Given Alice has an active subscription
    When she checks out a basket worth £30.00
    Then shipping is free

  Scenario: A lapsed subscriber pays standard shipping
    Given Alice's subscription lapsed yesterday
    When she checks out a basket worth £30.00
    Then shipping is £3.95

  Scenario: Subscription status is taken at checkout, not when the basket was filled
    Given Alice has a subscription that expires in one minute
    And she has a basket worth £30.00
    When two minutes pass and she checks out
    Then shipping is £3.95

  Scenario Outline: Shipping is charged the same whatever the basket is worth
    Given Alice has no subscription
    When she checks out a basket worth <basket>
    Then shipping is £3.95

    Examples:
      | basket  |
      | £5.00   |
      | £30.00  |
      | £500.00 |
