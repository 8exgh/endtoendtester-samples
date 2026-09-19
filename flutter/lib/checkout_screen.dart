import 'package:flutter/material.dart';

import 'pricing.dart';

/// https://endtoendtester.com/platforms/flutter-testing
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({
    super.key,
    required this.lines,
    this.maxQuantity = 10,
    this.gold = false,
  });

  final List<Line> lines;
  final int maxQuantity;
  final bool gold;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _controller = TextEditingController(text: '1');
  int _committed = 1;
  String? _error;
  bool _confirmed = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _enter(String raw) {
    final parsed = int.tryParse(raw);
    setState(() {
      if (parsed == null || parsed < 1) {
        _error = 'Quantity must be at least 1';
      } else if (parsed > widget.maxQuantity) {
        _error = 'Only ${widget.maxQuantity} in stock';
      } else {
        _error = null;
        _committed = parsed;
      }
    });
  }

  List<Line> get _scaled => widget.lines
      .map((line) => Line(sku: line.sku, unitCents: line.unitCents, quantity: _committed))
      .toList();

  @override
  Widget build(BuildContext context) {
    final total = totalCents(_scaled, gold: widget.gold);

    return MaterialApp(
      home: Scaffold(
        body: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Checkout', style: TextStyle(fontSize: 24)),
              Semantics(
                label: 'Quantity',
                child: TextField(
                  key: const Key('quantity'),
                  controller: _controller,
                  keyboardType: TextInputType.number,
                  onChanged: _enter,
                  decoration: const InputDecoration(labelText: 'Quantity'),
                ),
              ),
              if (_error != null)
                Text(_error!, key: const Key('error'), style: const TextStyle(color: Colors.red)),
              Text(formatMoney(total), key: const Key('total')),
              ElevatedButton(
                key: const Key('pay'),
                onPressed: _error == null ? () => setState(() => _confirmed = true) : null,
                child: const Text('Pay'),
              ),
              if (_confirmed) const Text('Order confirmed', key: Key('confirmation')),
            ],
          ),
        ),
      ),
    );
  }
}
