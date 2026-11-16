import 'package:flutter/material.dart';
import '../models/models.dart';
import '../constants/categories.dart';
import '../utils/calculations.dart';

class ReportsScreen extends StatelessWidget {
  final MonthDoc monthDoc;

  const ReportsScreen({super.key, required this.monthDoc});

  @override
  Widget build(BuildContext context) {
    final totalSpent = monthDoc.totalSpending();
    final categoriesWithSpending = APP_CATEGORIES.map((cat) {
      final spent = monthDoc.categorySpending(cat.id);
      final budget = (cat.id < monthDoc.budgets.length) ? monthDoc.budgets[cat.id] : 0.0;
      final ratio = budget > 0 ? (spent / budget) : (spent > 0 ? 1.0 : 0.0);
      return {
        'cat': cat,
        'spent': spent,
        'budget': budget,
        'ratio': ratio,
      };
    }).where((item) => (item['spent'] as double) > 0 || (item['budget'] as double) > 0).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('هێڵکارییەکان و ڕاپۆرتی بودجە', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Adherence Summary
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
                const Text('پوختەی پابەندبوون بە بودجە', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildLegendItem('پارێزراو (Safe)', const Color(0xFF10B981)),
                    const SizedBox(width: 12),
                    _buildLegendItem('نزیک سنوور (Near)', const Color(0xFFF59E0B)),
                    const SizedBox(width: 12),
                    _buildLegendItem('تێپەڕبوو (Over)', const Color(0xFFEF4444)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text('بەراوردکاری پۆلەکان بەپێی بودجە', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 10),
          if (categoriesWithSpending.isEmpty)
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Text('هیچ خەرجی یان بودجەیەک تۆمار نەکراوە بۆ ئەم مانگە'),
            )
          else
            ...categoriesWithSpending.map((item) {
              final cat = item['cat'] as CategoryItem;
              final spent = item['spent'] as double;
              final budget = item['budget'] as double;
              final ratio = item['ratio'] as double;

              Color statusColor;
              String statusLabel;
              if (budget > 0 && spent > budget) {
                statusColor = const Color(0xFFEF4444); // Red: Over budget
                statusLabel = 'تێپەڕیوە';
              } else if (budget > 0 && ratio >= 0.8) {
                statusColor = const Color(0xFFF59E0B); // Amber: Near limit
                statusLabel = 'نزیکە';
              } else {
                statusColor = const Color(0xFF10B981); // Green: Safe
                statusLabel = 'سەلامەت';
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(cat.icon, color: cat.color, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(cat.kurdishName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            statusLabel,
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: budget > 0 ? (spent / budget).clamp(0.0, 1.0) : 1.0,
                        backgroundColor: Colors.grey.shade100,
                        valueColor: AlwaysStoppedAnimation(statusColor),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('خەرجکراو: ${CurrencyHelper.formatPlain(spent)} د.ع', style: const TextStyle(fontSize: 12)),
                        Text('بودجە: ${CurrencyHelper.formatPlain(budget)} د.ع', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11)),
      ],
    );
  }
}
