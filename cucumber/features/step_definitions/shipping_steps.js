import assert from 'node:assert/strict';
import { Given, When, Then, Before } from '@cucumber/cucumber';
import { Customer, shippingCentsAt } from '../../src/shipping.js';

/* Steps are domain-level. None of them mentions a button, a selector or a
   page — which is what keeps the feature file a specification rather than
   a script written in English.
   https://endtoendtester.com/practices/given-when-then */

const NOW = Date.parse('2026-01-01T12:00:00Z');
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

const pounds = (text) => Math.round(Number(text.replace('£', '')) * 100);

Before(function () {
  this.now = NOW;
  this.customer = null;
  this.basketCents = 0;
  this.shippingCents = null;
});

Given('Alice has an active subscription', function () {
  this.customer = new Customer('Alice', { subscriptionExpiresAt: NOW + 30 * DAY });
});

Given("Alice's subscription lapsed yesterday", function () {
  this.customer = new Customer('Alice', { subscriptionExpiresAt: NOW - DAY });
});

Given('Alice has no subscription', function () {
  this.customer = new Customer('Alice');
});

Given('Alice has a subscription that expires in one minute', function () {
  this.customer = new Customer('Alice', { subscriptionExpiresAt: NOW + MINUTE });
});

Given('she has a basket worth {word}', function (amount) {
  this.basketCents = pounds(amount);
});

When('she checks out a basket worth {word}', function (amount) {
  this.basketCents = pounds(amount);
  this.shippingCents = shippingCentsAt(this.customer, this.now);
});

When('two minutes pass and she checks out', function () {
  this.now = NOW + 2 * MINUTE;
  this.shippingCents = shippingCentsAt(this.customer, this.now);
});

Then('shipping is free', function () {
  assert.equal(this.shippingCents, 0);
});

/* A regular expression rather than `{word}`: `shipping is {word}` also
   matches "shipping is free", and Cucumber refuses to guess between two
   definitions that both match. Narrowing it to an amount is the fix, and
   the ambiguity error is one of the more common first-day surprises. */
Then(/^shipping is (£[\d.]+)$/, function (amount) {
  assert.equal(this.shippingCents, pounds(amount));
});
