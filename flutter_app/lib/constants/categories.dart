import 'package:flutter/material.dart';

class CategoryItem {
  final int id;
  final String kurdishName;
  final String englishName;
  final IconData icon;
  final Color color;
  final bool isNeed;

  const CategoryItem({
    required this.id,
    required this.kurdishName,
    required this.englishName,
    required this.icon,
    required this.color,
    required this.isNeed,
  });
}

const List<CategoryItem> APP_CATEGORIES = [
  CategoryItem(
    id: 0,
    kurdishName: 'کرێی خانوو یان قیست',
    englishName: 'Rent / Installment',
    icon: Icons.home_rounded,
    color: Color(0xFF0F766E),
    isNeed: true,
  ),
  CategoryItem(
    id: 1,
    kurdishName: 'کارەبا و مۆلیدە',
    englishName: 'Electricity & Generator',
    icon: Icons.bolt_rounded,
    color: Color(0xFFD97706),
    isNeed: true,
  ),
  CategoryItem(
    id: 2,
    kurdishName: 'ئاو',
    englishName: 'Water',
    icon: Icons.water_drop_rounded,
    color: Color(0xFF0284C7),
    isNeed: true,
  ),
  CategoryItem(
    id: 3,
    kurdishName: 'گاز و نەوت',
    englishName: 'Gas & Fuel',
    icon: Icons.local_fire_department_rounded,
    color: Color(0xFFEA580C),
    isNeed: true,
  ),
  CategoryItem(
    id: 4,
    kurdishName: 'ئینتەرنێت و باڵانس',
    englishName: 'Internet & Mobile Balance',
    icon: Icons.wifi_rounded,
    color: Color(0xFF4F46E5),
    isNeed: true,
  ),
  CategoryItem(
    id: 5,
    kurdishName: 'پاککەرەوە و پێداویستی ماڵ',
    englishName: 'Household Essentials',
    icon: Icons.cleaning_services_rounded,
    color: Color(0xFF0D9488),
    isNeed: true,
  ),
  CategoryItem(
    id: 6,
    kurdishName: 'خواردن و پێداویستی بازاڕ (مارکێت)',
    englishName: 'Groceries & Market',
    icon: Icons.shopping_cart_rounded,
    color: Color(0xFF16A34A),
    isNeed: true,
  ),
  CategoryItem(
    id: 7,
    kurdishName: 'سەوزە و میوە و گۆشت',
    englishName: 'Meat & Produce',
    icon: Icons.restaurant_rounded,
    color: Color(0xFF65A30D),
    isNeed: true,
  ),
  CategoryItem(
    id: 8,
    kurdishName: 'بەنزین و ڕۆنی سەیارە',
    englishName: 'Fuel & Car Oil',
    icon: Icons.local_gas_station_rounded,
    color: Color(0xFFDC2626),
    isNeed: true,
  ),
  CategoryItem(
    id: 9,
    kurdishName: 'چاککردنەوەی سەیارە و مۆڵەت',
    englishName: 'Car Maintenance',
    icon: Icons.build_rounded,
    color: Color(0xFF78716C),
    isNeed: true,
  ),
  CategoryItem(
    id: 10,
    kurdishName: 'تەکسی و هاتوچۆ',
    englishName: 'Taxi & Transport',
    icon: Icons.local_taxi_rounded,
    color: Color(0xFFCA8A04),
    isNeed: true,
  ),
  CategoryItem(
    id: 11,
    kurdishName: 'پزیشک، دەرمان و نەخۆشخانە',
    englishName: 'Medical & Healthcare',
    icon: Icons.medical_services_rounded,
    color: Color(0xFFE11D48),
    isNeed: true,
  ),
  CategoryItem(
    id: 12,
    kurdishName: 'کرێی خوێندن و پەیمانگا',
    englishName: 'Tuition & Education',
    icon: Icons.school_rounded,
    color: Color(0xFF2563EB),
    isNeed: true,
  ),
  CategoryItem(
    id: 13,
    kurdishName: 'خەرجی منداڵ و باخچە',
    englishName: 'Kids & Daycare',
    icon: Icons.child_care_rounded,
    color: Color(0xFF9333EA),
    isNeed: true,
  ),
  CategoryItem(
    id: 14,
    kurdishName: 'پۆشاک و پێڵاو',
    englishName: 'Clothing & Shoes',
    icon: Icons.checkroom_rounded,
    color: Color(0xFFC026D3),
    isNeed: false,
  ),
  CategoryItem(
    id: 15,
    kurdishName: 'نانخواردنی دەرەوە و چێشتخانە',
    englishName: 'Restaurants & Dining',
    icon: Icons.lunch_dining_rounded,
    color: Color(0xFFEA580C),
    isNeed: false,
  ),
  CategoryItem(
    id: 16,
    kurdishName: 'قاوەخانە و کافێ',
    englishName: 'Café & Coffee',
    icon: Icons.coffee_rounded,
    color: Color(0xFF78350F),
    isNeed: false,
  ),
  CategoryItem(
    id: 17,
    kurdishName: 'گەشت و سەیران و کات بەسەربردن',
    englishName: 'Travel & Trips',
    icon: Icons.flight_takeoff_rounded,
    color: Color(0xFF0284C7),
    isNeed: false,
  ),
  CategoryItem(
    id: 18,
    kurdishName: 'دیاری و خێرخوازی و بەخشین',
    englishName: 'Gifts & Charity',
    icon: Icons.volunteer_activism_rounded,
    color: Color(0xFFE11D48),
    isNeed: false,
  ),
  CategoryItem(
    id: 19,
    kurdishName: 'قەرزدانەوە و قیستی تر',
    englishName: 'Debt Repayments',
    icon: Icons.payments_rounded,
    color: Color(0xFF64748B),
    isNeed: true,
  ),
  CategoryItem(
    id: 20,
    kurdishName: 'کۆمەڵە (کومەڵە)',
    englishName: 'Kumala / Group Rotating',
    icon: Icons.groups_rounded,
    color: Color(0xFF0F766E),
    isNeed: true,
  ),
  CategoryItem(
    id: 21,
    kurdishName: 'زێڕ و پاشەکەوت',
    englishName: 'Gold & Savings',
    icon: Icons.monetization_on_rounded,
    color: Color(0xFFD97706),
    isNeed: true,
  ),
];

CategoryItem getCategoryById(int id) {
  if (id >= 0 && id < APP_CATEGORIES.length) {
    return APP_CATEGORIES[id];
  }
  return APP_CATEGORIES[6]; // Fallback groceries
}
