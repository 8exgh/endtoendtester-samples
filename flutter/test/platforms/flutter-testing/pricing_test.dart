import 'package:endtoendtester_samples_flutter/pricing.dart';
import 'package:flutter_test/flutter_test.dart';

/// Unit tests: the Dart VM, microseconds, no widgets at all.
/// https://endtoendtester.com/platforms/flutter-testing
void main() {
  group('shippingCents', () {
    for (final (subtotal, expected) in [(0, 395), (4999, 395), (5000, 0), (12000, 0)]) {
      test('charges $expected on a subtotal of $subtotal', () {
        expect(shippingCents(subtotal), expected);
      });
    }

    test('ships a gold customer free whatever the subtotal is', () {
      expect(shippingCents(1, gold: true), 0);
    });
  });

  group('totals', () {
    test('sums every line at its own quantity', () {
      expect(
        subtotalCents([
          const Line(sku: 'book-1', unitCents: 1200, quantity: 2),
          const Line(sku: 'pen-2', unitCents: 500),
        ]),
        2900,
      );
    });

    test('adds shipping to the subtotal below the threshold', () {
      expect(totalCents([const Line(sku: 'book-1', unitCents: 1200, quantity: 2)]), 2795);
    });
  });

  test('formats minor units as pounds', () {
    expect(formatMoney(2795), '£27.95');
    expect(formatMoney(5), '£0.05');
  });
}
