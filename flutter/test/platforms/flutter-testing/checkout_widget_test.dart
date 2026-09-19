import 'package:endtoendtester_samples_flutter/checkout_screen.dart';
import 'package:endtoendtester_samples_flutter/pricing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Widget tests: a real widget tree, real layout, real gesture dispatch, in
/// a headless environment and in milliseconds. This is where most of a
/// Flutter suite belongs. https://endtoendtester.com/platforms/flutter-testing
void main() {
  const basket = [Line(sku: 'book-1', unitCents: 1200)];

  testWidgets('shows the total for the quantity it starts with', (tester) async {
    await tester.pumpWidget(const CheckoutScreen(lines: basket));

    expect(find.byKey(const Key('total')), findsOneWidget);
    expect(find.text('£15.95'), findsOneWidget); // 1200 + 395 shipping
  });

  testWidgets('recalculates the total when the quantity changes', (tester) async {
    await tester.pumpWidget(const CheckoutScreen(lines: basket));

    await tester.enterText(find.byKey(const Key('quantity')), '5');
    await tester.pump();

    // 5 x £12.00 = £60.00, which is over the threshold, so shipping is free.
    expect(find.text('£60.00'), findsOneWidget);
  });

  testWidgets('shows an error and disables pay when the quantity is too high', (tester) async {
    await tester.pumpWidget(const CheckoutScreen(lines: basket, maxQuantity: 10));

    await tester.enterText(find.byKey(const Key('quantity')), '11');
    await tester.pump();

    expect(find.text('Only 10 in stock'), findsOneWidget);
    final pay = tester.widget<ElevatedButton>(find.byKey(const Key('pay')));
    expect(pay.onPressed, isNull);
  });

  testWidgets('confirms the order once pay is tapped', (tester) async {
    await tester.pumpWidget(const CheckoutScreen(lines: basket));

    await tester.tap(find.byKey(const Key('pay')));
    // pumpAndSettle runs frames until nothing is scheduled. It times out
    // against an indefinite animation, which is why a looping progress
    // indicator is the usual culprit when it hangs.
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('confirmation')), findsOneWidget);
  });

  testWidgets('finds the field by the label a screen reader announces', (tester) async {
    /* The semantics tree is not built in a widget test unless you ask for
       it, so find.bySemanticsLabel silently finds nothing — which looks
       exactly like a missing label and is not one. ensureSemantics() turns
       it on, and the handle has to be disposed or the next test inherits
       an enabled tree it did not ask for. */
    final handle = tester.ensureSemantics();
    addTearDown(handle.dispose);

    await tester.pumpWidget(const CheckoutScreen(lines: basket));

    expect(find.bySemanticsLabel('Quantity'), findsWidgets);
  });

  testWidgets('lays out without overflowing a narrow screen', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const CheckoutScreen(lines: basket));
    await tester.pumpAndSettle();

    // takeException catches layout overflow, which is Flutter's most common
    // visual defect and otherwise only a yellow stripe nobody looks at.
    expect(tester.takeException(), isNull);
    expect(find.text('Checkout'), findsOneWidget);
  });
}
