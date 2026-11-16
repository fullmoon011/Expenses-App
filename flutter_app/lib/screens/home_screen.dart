import 'package:flutter/material.dart';
import '../models/models.dart';
import 'expenses_screen.dart';
import 'savings_screen.dart';
import 'reports_screen.dart';
import 'wealth_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentTabIndex = 0;

  late MonthDoc _monthDoc;
  late List<SavingsGoal> _goals;

  @override
  void initState() {
    super.initState();
    _monthDoc = MonthDoc(
      incomes: [1800000.0, 1200000.0],
      otherIncome: 0.0,
      budgets: [
        450000.0, // Rent
        120000.0, // Electricity
        25000.0,  // Water
        50000.0,  // Gas
        40000.0,  // Internet
        60000.0,  // Household
        400000.0, // Groceries
        150000.0, // Produce/Meat
        100000.0, // Fuel
        50000.0,  // Car maint
        40000.0,  // Transport
        75000.0,  // Medical
        0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0
      ],
      transactions: [
        ExpenseTx(
          id: '1',
          categoryIndex: 6,
          date: '2026-11-01',
          amount: 65000.0,
          currency: CurrencyType.iqd,
          exchangeRate: 1500.0,
          personIndex: 0,
          note: 'کڕینی پێداویستی مارکێت',
        ),
        ExpenseTx(
          id: '2',
          categoryIndex: 4,
          date: '2026-11-02',
          amount: 35000.0,
          currency: CurrencyType.iqd,
          exchangeRate: 1500.0,
          personIndex: 0,
          note: 'کارت و باڵانسی ئینتەرنێت',
        ),
        ExpenseTx(
          id: '3',
          categoryIndex: 8,
          date: '2026-11-02',
          amount: 50.0,
          currency: CurrencyType.usd,
          exchangeRate: 1500.0,
          personIndex: 0,
          note: 'بەنزینی ئۆتۆمبێل (سوپەر)',
        ),
      ],
    );

    _goals = [
      SavingsGoal(
        id: '1',
        name: 'سندوقی فریاگوزاری خێزان',
        target: 5000000.0,
        saved: 2400000.0,
      ),
      SavingsGoal(
        id: '2',
        name: 'کڕینی مسقاڵێک زێڕ',
        target: 650000.0,
        saved: 450000.0,
      ),
    ];
  }

  void _handleAddExpense(ExpenseTx tx) {
    setState(() {
      _monthDoc = MonthDoc(
        incomes: _monthDoc.incomes,
        otherIncome: _monthDoc.otherIncome,
        budgets: _monthDoc.budgets,
        transactions: [tx, ..._monthDoc.transactions],
        isClosed: _monthDoc.isClosed,
      );
    });
  }

  void _handleDeleteExpense(int index) {
    setState(() {
      final updatedList = List<ExpenseTx>.from(_monthDoc.transactions)..removeAt(index);
      _monthDoc = MonthDoc(
        incomes: _monthDoc.incomes,
        otherIncome: _monthDoc.otherIncome,
        budgets: _monthDoc.budgets,
        transactions: updatedList,
        isClosed: _monthDoc.isClosed,
      );
    });
  }

  void _handleAddGoal(SavingsGoal goal) {
    setState(() {
      _goals.add(goal);
    });
  }

  void _handleDeposit(int goalIndex, double amount) {
    setState(() {
      final targetGoal = _goals[goalIndex];
      _goals[goalIndex] = targetGoal.copyWith(saved: targetGoal.saved + amount);
    });
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> screens = [
      ExpensesScreen(
        monthDoc: _monthDoc,
        onAddExpense: _handleAddExpense,
        onDeleteExpense: _handleDeleteExpense,
      ),
      SavingsScreen(
        goals: _goals,
        onAddGoal: _handleAddGoal,
        onDeposit: _handleDeposit,
      ),
      ReportsScreen(monthDoc: _monthDoc),
      const WealthScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF0F766E)),
            SizedBox(width: 8),
            Text(
              'داهاتوو',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded),
            onPressed: () {},
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentTabIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTabIndex,
        onDestinationSelected: (idx) => setState(() => _currentTabIndex = idx),
        indicatorColor: const Color(0xFF0F766E).withValues(alpha: 0.15),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long_rounded, color: Color(0xFF0F766E)),
            label: 'خەرجییەکان',
          ),
          NavigationDestination(
            icon: Icon(Icons.savings_outlined),
            selectedIcon: Icon(Icons.savings_rounded, color: Color(0xFF0F766E)),
            label: 'پاشەکەوت',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart_outlined),
            selectedIcon: Icon(Icons.bar_chart_rounded, color: Color(0xFF0F766E)),
            label: 'هێڵکارییەکان',
          ),
          NavigationDestination(
            icon: Icon(Icons.monetization_on_outlined),
            selectedIcon: Icon(Icons.monetization_on_rounded, color: Color(0xFF0F766E)),
            label: 'زێڕ و سامان',
          ),
        ],
      ),
    );
  }
}
