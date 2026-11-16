import 'package:flutter/material.dart';
import '../utils/calculations.dart';

class WealthScreen extends StatefulWidget {
  const WealthScreen({super.key});

  @override
  State<WealthScreen> createState() => _WealthScreenState();
}

class _WealthScreenState extends State<WealthScreen> {
  double _mithqalRate = 650000.0;
  double _usdRate = 1500.0;
  final TextEditingController _goldWeightController = TextEditingController(text: '10');

  @override
  Widget build(BuildContext context) {
    final weight = double.tryParse(_goldWeightController.text.trim()) ?? 0.0;
    final totalGoldIqd = weight * _mithqalRate;
    final totalGoldUsd = _usdRate > 0 ? (totalGoldIqd / _usdRate) : 0.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('زێڕ و سەروەت و سامان', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Gold Overview Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFB45309), Color(0xFFD97706), Color(0xFFF59E0B)],
                begin: Alignment.topRight,
                end: Alignment.bottomLeft,
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.amber.withValues(alpha: 0.3),
                  blurRadius: 15,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.monetization_on_rounded, color: Colors.white, size: 22),
                    SizedBox(width: 8),
                    Text('نرخی زێڕی مسقاڵ (عیار ٢١)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  '${CurrencyHelper.formatPlain(_mithqalRate)} د.ع / مسقاڵ',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                Text(
                  'نرخی ئاڵوگۆڕی دۆلار: 100\$ = ${CurrencyHelper.formatPlain(_usdRate * 100)} د.ع',
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Live Gold Calculator
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('حاسیبەی خێرای زێڕ (مسقاڵ)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 12),
                TextField(
                  controller: _goldWeightController,
                  keyboardType: TextInputType.number,
                  onChanged: (_) => setState(() {}),
                  decoration: InputDecoration(
                    labelText: 'کێشی زێڕ بە مسقاڵ',
                    hintText: 'نموونە: 10',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    suffixText: 'مسقاڵ',
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('بەهای گشتی بە دینار', style: TextStyle(fontSize: 12, color: Colors.brown)),
                          const SizedBox(height: 2),
                          Text(
                            '${CurrencyHelper.formatPlain(totalGoldIqd)} د.ع',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF78350F)),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('بەهای گشتی بە دۆلار', style: TextStyle(fontSize: 12, color: Colors.brown)),
                          const SizedBox(height: 2),
                          Text(
                            '\$${CurrencyHelper.formatPlain(totalGoldUsd)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF78350F)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
