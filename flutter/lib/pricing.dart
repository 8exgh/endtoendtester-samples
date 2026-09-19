/// The rules, as pure functions. https://endtoendtester.com/platforms/flutter-testing
library;

const int freeShippingThresholdCents = 5000;
const int standardShippingCents = 395;

class Line {
  const Line({required this.sku, required this.unitCents, this.quantity = 1});

  final String sku;
  final int unitCents;
  final int quantity;

  int get totalCents => unitCents * quantity;
}

int subtotalCents(List<Line> lines) =>
    lines.fold(0, (sum, line) => sum + line.totalCents);

/// Free at or above the threshold. The boundary is the point.
int shippingCents(int subtotal, {bool gold = false}) =>
    gold || subtotal >= freeShippingThresholdCents ? 0 : standardShippingCents;

int totalCents(List<Line> lines, {bool gold = false}) {
  final subtotal = subtotalCents(lines);
  return subtotal + shippingCents(subtotal, gold: gold);
}

String formatMoney(int cents) => '£${(cents / 100).toStringAsFixed(2)}';
