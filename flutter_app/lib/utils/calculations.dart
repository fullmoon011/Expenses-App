import 'package:intl/intl.dart';
import '../models/models.dart';

class CurrencyHelper {
  static final NumberFormat _formatter = NumberFormat('#,###', 'en_US');

  static String formatAmount(double amount) {
    if (amount >= 1000000) {
      final millions = amount / 1000000.0;
      return '${millions.toStringAsFixed(millions.truncateToDouble() == millions ? 0 : 2)}م (M)';
    }
    return _formatter.format(amount.round());
  }

  static String formatPlain(double amount) {
    return _formatter.format(amount.round());
  }

  static String formatCurrency(double amount, CurrencyType type) {
    final formatted = formatPlain(amount);
    return type == CurrencyType.usd ? '\$$formatted' : '$formatted د.ع';
  }
}
