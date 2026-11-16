import 'dart:convert';

enum CurrencyType { iqd, usd }

class ExpenseTx {
  final String id;
  final int categoryIndex; // 0-27
  final String date; // YYYY-MM-DD
  final double amount;
  final CurrencyType currency;
  final double exchangeRate;
  final int personIndex;
  final bool isShared;
  final String? note;
  final String? photoBase64;

  ExpenseTx({
    required this.id,
    required this.categoryIndex,
    required this.date,
    required this.amount,
    required this.currency,
    required this.exchangeRate,
    required this.personIndex,
    this.isShared = false,
    this.note,
    this.photoBase64,
  });

  double valueInIqd([double? fallbackRate]) {
    final rate = exchangeRate > 0 ? exchangeRate : (fallbackRate ?? 1500.0);
    return currency == CurrencyType.usd ? amount * rate : amount;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'c': categoryIndex,
        'd': date,
        'a': amount,
        'cu': currency == CurrencyType.usd ? 'U' : 'D',
        'r': exchangeRate,
        'w': personIndex,
        's': isShared ? 1 : 0,
        if (note != null && note!.isNotEmpty) 'n': note,
        if (photoBase64 != null) 'ph': photoBase64,
      };

  factory ExpenseTx.fromJson(Map<String, dynamic> json) => ExpenseTx(
        id: json['id']?.toString() ?? DateTime.now().microsecondsSinceEpoch.toString(),
        categoryIndex: (json['c'] as num?)?.toInt() ?? 6,
        date: json['d']?.toString() ?? DateTime.now().toIso8601String().substring(0, 10),
        amount: (json['a'] as num?)?.toDouble() ?? 0.0,
        currency: json['cu'] == 'U' ? CurrencyType.usd : CurrencyType.iqd,
        exchangeRate: (json['r'] as num?)?.toDouble() ?? 1500.0,
        personIndex: (json['w'] as num?)?.toInt() ?? 0,
        isShared: json['s'] == 1,
        note: json['n']?.toString(),
        photoBase64: json['ph']?.toString(),
      );
}

class SavingsGoal {
  final String id;
  final String name;
  final double target;
  final double saved;
  final String? targetMonth; // YYYY-MM
  final double? monthlyTarget;

  SavingsGoal({
    required this.id,
    required this.name,
    required this.target,
    this.saved = 0.0,
    this.targetMonth,
    this.monthlyTarget,
  });

  double get progressPercentage => target > 0 ? (saved / target).clamp(0.0, 1.0) : 0.0;
  double get remaining => (target - saved).clamp(0.0, double.infinity);

  SavingsGoal copyWith({double? saved, String? name, double? target}) => SavingsGoal(
        id: id,
        name: name ?? this.name,
        target: target ?? this.target,
        saved: saved ?? this.saved,
        targetMonth: targetMonth,
        monthlyTarget: monthlyTarget,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'n': name,
        't': target,
        's': saved,
        if (targetMonth != null) 'dt': targetMonth,
        if (monthlyTarget != null) 'mt': monthlyTarget,
      };

  factory SavingsGoal.fromJson(Map<String, dynamic> json) => SavingsGoal(
        id: json['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
        name: json['n']?.toString() ?? 'ئامانجی پاشەکەوت',
        target: (json['t'] as num?)?.toDouble() ?? 0.0,
        saved: (json['s'] as num?)?.toDouble() ?? 0.0,
        targetMonth: json['dt']?.toString(),
        monthlyTarget: (json['mt'] as num?)?.toDouble(),
      );
}

class MonthDoc {
  final List<double> incomes;
  final double otherIncome;
  final List<double> budgets;
  final List<ExpenseTx> transactions;
  final bool isClosed;

  MonthDoc({
    required this.incomes,
    this.otherIncome = 0.0,
    required this.budgets,
    required this.transactions,
    this.isClosed = false,
  });

  double get totalIncome => incomes.fold(0.0, (sum, val) => sum + val) + otherIncome;

  double totalSpending([double defaultRate = 1500.0]) =>
      transactions.fold(0.0, (sum, tx) => sum + tx.valueInIqd(defaultRate));

  double categorySpending(int categoryIndex, [double defaultRate = 1500.0]) =>
      transactions
          .where((tx) => tx.categoryIndex == categoryIndex)
          .fold(0.0, (sum, tx) => sum + tx.valueInIqd(defaultRate));

  Map<String, dynamic> toJson() => {
        'inc': incomes,
        'oi': otherIncome,
        'bud': budgets,
        'tx': transactions.map((t) => t.toJson()).toList(),
        'closed': isClosed ? 1 : 0,
      };

  factory MonthDoc.fromJson(Map<String, dynamic> json) => MonthDoc(
        incomes: (json['inc'] as List?)?.map((e) => (e as num).toDouble()).toList() ?? [1800000.0, 1200000.0],
        otherIncome: (json['oi'] as num?)?.toDouble() ?? 0.0,
        budgets: (json['bud'] as List?)?.map((e) => (e as num).toDouble()).toList() ?? List.filled(28, 0.0),
        transactions: (json['tx'] as List?)?.map((e) => ExpenseTx.fromJson(e as Map<String, dynamic>)).toList() ?? [],
        isClosed: json['closed'] == 1,
      );

  factory MonthDoc.initial() => MonthDoc(
        incomes: [1800000.0, 1200000.0],
        otherIncome: 0.0,
        budgets: List.filled(28, 0.0),
        transactions: [],
        isClosed: false,
      );
}

class GoldPriceConfig {
  final double mithqalPriceIqd;
  final double usdRate;

  GoldPriceConfig({
    this.mithqalPriceIqd = 650000.0,
    this.usdRate = 1500.0,
  });
}
