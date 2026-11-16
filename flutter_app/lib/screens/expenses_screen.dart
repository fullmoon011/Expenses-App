import 'package:flutter/material.dart';
import '../models/models.dart';
import '../constants/categories.dart';
import '../utils/calculations.dart';

class ExpensesScreen extends StatefulWidget {
  final MonthDoc monthDoc;
  final Function(ExpenseTx) onAddExpense;
  final Function(int) onDeleteExpense;

  const ExpensesScreen({
    super.key,
    required this.monthDoc,
    required this.onAddExpense,
    required this.onDeleteExpense,
  });

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  String _searchQuery = '';
  int? _selectedCategoryFilter;

  void _showAddExpenseModal(BuildContext context) {
    int selectedCat = 6;
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    CurrencyType selectedCurrency = CurrencyType.iqd;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'تۆمارکردنی خەرجی نوێ',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Currency & Amount
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      autofocus: true,
                      decoration: InputDecoration(
                        labelText: 'بڕی خەرجی',
                        hintText: 'نموونە: 25000',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                        prefixIcon: const Icon(Icons.money_rounded),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SegmentedButton<CurrencyType>(
                    segments: const [
                      ButtonSegment(value: CurrencyType.iqd, label: Text('دینار')),
                      ButtonSegment(value: CurrencyType.usd, label: Text('\$')),
                    ],
                    selected: {selectedCurrency},
                    onSelectionChanged: (val) {
                      setModalState(() => selectedCurrency = val.first);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              // Category Picker Dropdown
              DropdownButtonFormField<int>(
                value: selectedCat,
                decoration: InputDecoration(
                  labelText: 'پۆلی خەرجی',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  prefixIcon: Icon(getCategoryById(selectedCat).icon, color: getCategoryById(selectedCat).color),
                ),
                items: APP_CATEGORIES.map((cat) {
                  return DropdownMenuItem<int>(
                    value: cat.id,
                    child: Row(
                      children: [
                        Icon(cat.icon, color: cat.color, size: 20),
                        const SizedBox(width: 8),
                        Text(cat.kurdishName, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null) setModalState(() => selectedCat = val);
                },
              ),
              const SizedBox(height: 12),
              // Note / Details
              TextField(
                controller: noteController,
                decoration: InputDecoration(
                  labelText: 'تێبینی یان شوێنی کڕین (ئارەزوومەندانە)',
                  hintText: 'نموونە: کڕینی پێداویستی ماڵ لە مارکێت',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                  prefixIcon: const Icon(Icons.edit_note_rounded),
                ),
              ),
              const SizedBox(height: 16),
              // Save button
              ElevatedButton.icon(
                onPressed: () {
                  final amt = double.tryParse(amountController.text.trim()) ?? 0.0;
                  if (amt <= 0) return;

                  final tx = ExpenseTx(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    categoryIndex: selectedCat,
                    date: DateTime.now().toIso8601String().substring(0, 10),
                    amount: amt,
                    currency: selectedCurrency,
                    exchangeRate: 1500.0,
                    personIndex: 0,
                    note: noteController.text.trim(),
                  );

                  widget.onAddExpense(tx);
                  Navigator.pop(ctx);
                },
                icon: const Icon(Icons.check_circle_outline_rounded),
                label: const Text('پاشەکەوت و تۆمارکردن', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F766E),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalSpent = widget.monthDoc.totalSpending();
    final totalInc = widget.monthDoc.totalIncome;
    final remaining = totalInc - totalSpent;

    final filteredTxs = widget.monthDoc.transactions.where((tx) {
      if (_selectedCategoryFilter != null && tx.categoryIndex != _selectedCategoryFilter) {
        return false;
      }
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final cat = getCategoryById(tx.categoryIndex);
        final inNote = (tx.note ?? '').toLowerCase().contains(q);
        final inCat = cat.kurdishName.toLowerCase().contains(q) || cat.englishName.toLowerCase().contains(q);
        return inNote || inCat;
      }
      return true;
    }).toList();

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddExpenseModal(context),
        backgroundColor: const Color(0xFF0F766E),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('خەرجی نوێ', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: CustomScrollView(
        slivers: [
          // Header Summary Card
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F766E), Color(0xFF115E59), Color(0xFF0F172A)],
                  begin: Alignment.topRight,
                  end: Alignment.bottomLeft,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F766E).withValues(alpha: 0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  const Text(
                    'باڵانسی ماوەی ئەم مانگە',
                    style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${CurrencyHelper.formatPlain(remaining)} د.ع',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24, height: 1),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          const Text('کۆی داهات', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(
                            '${CurrencyHelper.formatAmount(totalInc)} د.ع',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ],
                      ),
                      Container(width: 1, height: 32, color: Colors.white24),
                      Column(
                        children: [
                          const Text('کۆی خەرجی', style: TextStyle(color: Colors.white70, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text(
                            '${CurrencyHelper.formatAmount(totalSpent)} د.ع',
                            style: const TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Search and Filters
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: InputDecoration(
                  hintText: 'گەڕان لە خەرجییەکان، مارکێت یان پۆل...',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  suffixIcon: _searchQuery.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () => setState(() => _searchQuery = ''),
                        )
                      : null,
                  filled: true,
                  fillColor: Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 12)),

          // Transactions Count Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'لیستی خەرجییەکان (${filteredTxs.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  Text(
                    'ئەم مانگە',
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),

          // Transactions List
          filteredTxs.isEmpty
              ? SliverToBoxAdapter(
                  child: Container(
                    margin: const EdgeInsets.all(24),
                    padding: const EdgeInsets.all(32),
                    alignment: Alignment.center,
                    child: Column(
                      children: [
                        Icon(Icons.receipt_long_rounded, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(
                          'هیچ خەرجییەک نەدۆزرایەوە',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                )
              : SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final tx = filteredTxs[index];
                      final cat = getCategoryById(tx.categoryIndex);

                      return Dismissible(
                        key: Key(tx.id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerLeft,
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          color: Colors.red.shade400,
                          child: const Icon(Icons.delete_outline_rounded, color: Colors.white),
                        ),
                        onDismissed: (_) {
                          widget.onDeleteExpense(index);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('خەرجییەکە سڕایەوە')),
                          );
                        },
                        child: Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: ListTile(
                            leading: Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: cat.color.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(cat.icon, color: cat.color, size: 22),
                            ),
                            title: Text(
                              cat.kurdishName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: Text(
                              tx.note?.isNotEmpty == true ? tx.note! : tx.date,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  CurrencyHelper.formatCurrency(tx.amount, tx.currency),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                if (tx.currency == CurrencyType.usd)
                                  Text(
                                    '≈ ${CurrencyHelper.formatPlain(tx.valueInIqd())} د.ع',
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                    childCount: filteredTxs.length,
                  ),
                ),

          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}
