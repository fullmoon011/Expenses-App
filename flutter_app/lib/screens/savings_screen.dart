import 'package:flutter/material.dart';
import '../models/models.dart';
import '../utils/calculations.dart';

class SavingsScreen extends StatefulWidget {
  final List<SavingsGoal> goals;
  final Function(SavingsGoal) onAddGoal;
  final Function(int, double) onDeposit;

  const SavingsScreen({
    super.key,
    required this.goals,
    required this.onAddGoal,
    required this.onDeposit,
  });

  @override
  State<SavingsScreen> createState() => _SavingsScreenState();
}

class _SavingsScreenState extends State<SavingsScreen> {
  String _sortOption = 'progress'; // 'progress', 'urgent', 'target'

  void _showAddGoalModal(BuildContext context) {
    final nameController = TextEditingController();
    final targetController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          left: 20,
          right: 20,
          top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'زیادکردنی ئامانجی نوێی پاشەکەوت',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: nameController,
              decoration: InputDecoration(
                labelText: 'ناوی ئامانج',
                hintText: 'نموونە: کڕینی ئۆتۆمبێل، گەشت، یاخود زێڕ',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: targetController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'بڕی ئامانج بە دینار',
                hintText: 'نموونە: 3000000',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                final targetAmt = double.tryParse(targetController.text.trim()) ?? 0.0;
                final name = nameController.text.trim();
                if (targetAmt <= 0 || name.isEmpty) return;

                widget.onAddGoal(SavingsGoal(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: name,
                  target: targetAmt,
                  saved: 0.0,
                ));
                Navigator.pop(ctx);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F766E),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('پاشەکەوتکردن و دەستپێکردن', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalTarget = widget.goals.fold(0.0, (s, g) => s + g.target);
    final totalSaved = widget.goals.fold(0.0, (s, g) => s + g.saved);
    final overallProgress = totalTarget > 0 ? (totalSaved / totalTarget).clamp(0.0, 1.0) : 0.0;

    final sortedGoals = [...widget.goals];
    if (_sortOption == 'progress') {
      sortedGoals.sort((a, b) => b.progressPercentage.compareTo(a.progressPercentage));
    } else if (_sortOption == 'target') {
      sortedGoals.sort((a, b) => b.target.compareTo(a.target));
    }

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddGoalModal(context),
        backgroundColor: const Color(0xFF0F766E),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_task_rounded),
        label: const Text('ئامانجی نوێ', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: CustomScrollView(
        slivers: [
          // KPI Card
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F766E), Color(0xFF047857)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'کۆی پاشەکەوتکراو',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${(overallProgress * 100).toStringAsFixed(1)}%',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${CurrencyHelper.formatPlain(totalSaved)} د.ع',
                    style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'لە کۆی ئامانجی ${CurrencyHelper.formatPlain(totalTarget)} د.ع',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 14),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: LinearProgressIndicator(
                      value: overallProgress,
                      backgroundColor: Colors.white24,
                      valueColor: const AlwaysStoppedAnimation(Color(0xFF34D399)),
                      minHeight: 8,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Sort Filter
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('ئامانجەکانی پاشەکەوت', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  DropdownButton<String>(
                    value: _sortOption,
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(value: 'progress', child: Text('بەرزترین پێشکەوتن', style: TextStyle(fontSize: 13))),
                      DropdownMenuItem(value: 'target', child: Text('گەورەترین ئامانج', style: TextStyle(fontSize: 13))),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _sortOption = val);
                    },
                  ),
                ],
              ),
            ),
          ),

          // Goals list
          sortedGoals.isEmpty
              ? SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: const Text('هیچ ئامانجێکی پاشەکەوت دانەنراوە'),
                  ),
                )
              : SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final goal = sortedGoals[index];
                      final origIdx = widget.goals.indexOf(goal);

                      return Container(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: Colors.grey.shade200),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  goal.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                                Text(
                                  '${(goal.progressPercentage * 100).toStringAsFixed(0)}%',
                                  style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F766E)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(6),
                              child: LinearProgressIndicator(
                                value: goal.progressPercentage,
                                backgroundColor: Colors.grey.shade200,
                                valueColor: const AlwaysStoppedAnimation(Color(0xFF0F766E)),
                                minHeight: 6,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'کۆکراوەتەوە: ${CurrencyHelper.formatAmount(goal.saved)} د.ع',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                                ),
                                Text(
                                  'ئامانج: ${CurrencyHelper.formatAmount(goal.target)} د.ع',
                                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            // Quick Deposit Button (+ 50,000 IQD)
                            Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  widget.onDeposit(origIdx, 50000.0);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('٥٠,٠٠٠ دینار زیادکرا بۆ «${goal.name}»')),
                                  );
                                },
                                icon: const Icon(Icons.flash_on_rounded, size: 16, color: Color(0xFFD97706)),
                                label: const Text('+ 50,000 د.ع (دانانی خێرا)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: sortedGoals.length,
                  ),
                ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
