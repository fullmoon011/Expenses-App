# پڕۆژەی فلاتەر (Flutter - Dart Project)

ئەم پڕۆژەیە وەرگێڕدراوەتەوە و ئامادەکراوە بە زمانی **Flutter (Dart)** لە ناو فۆڵدەری `flutter_app/` بۆ بەڕێوەبردنی تەواوی خەرجی، بودجە، پاشەکەوت و زێڕ.

---

### پێکهاتەی فایلەکانی فلاتەر (`flutter_app/`):
```text
flutter_app/
├── pubspec.yaml                 # پاکێج و dependencies (fl_chart, google_fonts, intl)
└── lib/
    ├── main.dart                # دەستپێکی پڕۆژە لەگەڵ Directionality RTL و فۆنتی Vazirmatn
    ├── models/
    │   └── models.dart          # مۆدێلەکانی ExpenseTx, MonthDoc, SavingsGoal
    ├── constants/
    │   └── categories.dart      # هەموو پۆلەکان بە کوردی و ئایکۆنی ڕەنگاوڕەنگ
    ├── utils/
    │   └── calculations.dart    # فۆرماتی پارە بە دیناری عێراقی (IQD) و دۆلار (USD)
    └── screens/
        ├── home_screen.dart     # باڕی خوارەوە (Bottom Navigation) بە زمانی کوردی
        ├── expenses_screen.dart # شاشەی خەرجییەکان، کارتی باڵانس و تۆمارکردنی خەرجی
        ├── savings_screen.dart  # پاشەکەوت + دوگمەی دانانی خێرا (+50,000 د.ع)
        ├── reports_screen.dart  # هێڵکارییەکان و ڕێژەی پابەندبوون بە بودجە
        └── wealth_screen.dart   # حاسیبەی زێڕ بە مسقاڵ و سەروەت و سامان
```

---

### چۆنیەتی کارپێکردن لە Android Studio:
1. بەرنامەی **Android Studio** بکەرەوە.
2. کلیک لەسەر **Open** بکە.
3. فۆڵدەری **`flutter_app`** هەڵبژێرە و **OK** دابگرە.
4. لە ناو تێرمیناڵی خوارەوەی Android Studio ئەم فەرمانە بنووسە:
   ```bash
   flutter pub get
   ```
5. مۆبایلەکەت یان ئیمولەیتەر هەڵبژێرە و کلیک لەسەر دوگمەی سەوزی **Run (▶)** بکە!
