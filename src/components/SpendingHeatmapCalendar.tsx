import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award,
  Plus,
  Receipt,
  User as UserIcon,
  ShoppingBag,
  ShieldCheck,
  Star
} from 'lucide-react';
import { ExpenseTx, MonthDoc, NamesConfig } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';
import { fmt, val } from '../utils/calculations';

interface SpendingHeatmapCalendarProps {
  currentMonth: string; // YYYY-MM
  doc: MonthDoc;
  names: NamesConfig;
  defaultRate: number;
  dailyAllowance: number;
  langIndex: number;
  t: (key: string) => string;
  onOpenAddExpenseForDate?: (dateStr: string) => void;
}

interface DayData {
  dayNumber: number;
  dateStr: string;
  weekdayIndex: number; // 0=Sun, 1=Mon, ..., 6=Sat
  txs: ExpenseTx[];
  totalSpent: number;
  isToday: boolean;
  isFuture: boolean;
  status: 'future' | 'no-spend' | 'safe' | 'moderate' | 'heavy';
}

const WEEKDAY_NAMES_KU = ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'];
const WEEKDAY_SHORT_KU = ['١شەم', '٢شەم', '٣شەم', '٤شەم', '٥شەم', 'هەینی', 'شەممە'];

export const SpendingHeatmapCalendar: React.FC<SpendingHeatmapCalendarProps> = ({
  currentMonth,
  doc,
  names,
  defaultRate,
  dailyAllowance,
  langIndex,
  t,
  onOpenAddExpenseForDate
}) => {
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const year = parseInt(currentMonth.slice(0, 4), 10);
  const month = parseInt(currentMonth.slice(5, 7), 10); // 1-12

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Compute days in month and data for every day
  const { days, padOffset, noSpendCount, passedDaysCount, totalMonthSpent, weekdayTotals } = useMemo(() => {
    const totalDays = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun, 6=Sat

    // Kurdish / Middle Eastern week typically starts on Saturday (index 6 in JS Date).
    // Saturday offset: (firstDayOfWeek + 1) % 7
    const offset = (firstDayOfWeek + 1) % 7;

    const daysList: DayData[] = [];
    const wdTotals = [0, 0, 0, 0, 0, 0, 0]; // Sat(0) .. Fri(6)
    let noSpend = 0;
    let passed = 0;
    let monthTotal = 0;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
      const dayDate = new Date(year, month - 1, d);
      const jsWeekday = dayDate.getDay(); // 0=Sun .. 6=Sat
      const kurdWeekdayIndex = (jsWeekday + 1) % 7; // 0=Sat, 1=Sun .. 6=Fri

      const txs = (doc.tx || []).filter((tx) => tx.d === dateStr);
      const totalSpent = txs.reduce((sum, tx) => sum + val(tx, defaultRate), 0);

      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      let status: DayData['status'] = 'future';
      if (!isFuture) {
        passed++;
        monthTotal += totalSpent;
        wdTotals[kurdWeekdayIndex] += totalSpent;

        if (totalSpent === 0) {
          status = 'no-spend';
          noSpend++;
        } else if (dailyAllowance <= 0 || totalSpent <= dailyAllowance * 0.5) {
          status = 'safe';
        } else if (totalSpent <= dailyAllowance) {
          status = 'moderate';
        } else {
          status = 'heavy';
        }
      }

      daysList.push({
        dayNumber: d,
        dateStr,
        weekdayIndex: kurdWeekdayIndex,
        txs,
        totalSpent,
        isToday,
        isFuture,
        status
      });
    }

    return {
      days: daysList,
      padOffset: offset,
      noSpendCount: noSpend,
      passedDaysCount: passed,
      totalMonthSpent: monthTotal,
      weekdayTotals: wdTotals
    };
  }, [year, month, currentMonth, doc.tx, defaultRate, dailyAllowance, todayStr]);

  // Find peak spending weekday
  const peakWeekday = useMemo(() => {
    let max = -1;
    let maxIdx = 0;
    weekdayTotals.forEach((tot, idx) => {
      if (tot > max) {
        max = tot;
        maxIdx = idx;
      }
    });
    const weekdayLabelsKu = ['شەممە', 'یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی'];
    return { name: weekdayLabelsKu[maxIdx], total: max };
  }, [weekdayTotals]);

  // Avg spend on active days
  const avgDailySpend = passedDaysCount > 0 ? Math.round(totalMonthSpent / passedDaysCount) : 0;

  return (
    <div className="space-y-4">
      {/* Top Gamified Metrics & No-Spend Days Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: No-Spend Days Banner */}
        <div className="sm:col-span-1 rounded-3xl p-5 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-slate-100 dark:to-slate-900 border border-emerald-400/30 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span>ڕۆژانی بێ-خەرجی (No-Spend)</span>
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {passedDaysCount > 0 ? Math.round((noSpendCount / passedDaysCount) * 100) : 0}%
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {noSpendCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ڕۆژ لە کۆی {passedDaysCount} ڕۆژی تۆمارکراو
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              {noSpendCount >= 8 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>نایابە! دەستگرتن بەسەر خەرجی بێپلاندا لە ئاستێکی زۆر بەرزدایە.</span>
                </>
              ) : (
                'ئامانج: لانی کەم ٨ ڕۆژ لە مانگدا بە بێ-خەرجی بهێڵەرەوە.'
              )}
            </p>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200/60 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (noSpendCount / 10) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Average Daily Spend */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>تێکڕای خەرجی ڕۆژانە</span>
          </span>

          <div className="my-3">
            <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {fmt(avgDailySpend)} <span className="text-xs font-normal text-slate-500">د.ع</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              بەراورد بە ڕێگەپێدراوی سەلامەت: <b className="text-slate-700 dark:text-slate-300 font-mono">{fmt(dailyAllowance)} د.ع</b>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>کۆی خەرجکراوی مانگ:</span>
            <b className="font-mono text-slate-800 dark:text-slate-200">{fmt(totalMonthSpent)} د.ع</b>
          </div>
        </div>

        {/* Card 3: Peak Weekday Behavioral Insight */}
        <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>نەریتی هەفتانە (Peak Day)</span>
          </span>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                ڕۆژانی {peakWeekday.name}
              </span>
            </div>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 block mt-1 font-medium">
              بەرزترین ئاستی خەرجی خێزان: {fmt(peakWeekday.total)} د.ع
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>ئامۆژگاری:</span>
            <span className="inline-flex items-center gap-1">
              <span>لە کۆتایی هەفتەدا پلانەکە توندتر بکەرەوە</span>
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Heatmap Calendar Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        {/* Calendar Title & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>ڕۆژژمێری گەرمی خەرجییەکان (Spending Heatmap)</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              کلیک لە هەر ڕۆژێک بکە بۆ بینینی خەرجییە وردەکانی ئەو بەروارە
            </span>
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-emerald-500/25 border border-emerald-500 text-emerald-600 flex items-center justify-center">
                <Star className="w-2 h-2 fill-current" />
              </span>
              <span>بێ-خەرجی (0)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800" />
              <span>کەم (≤50%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800" />
              <span>هاوسەنگ (≤100%)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800" />
              <span>بەرز (&gt;100%)</span>
            </span>
          </div>
        </div>

        {/* Weekday Names Header (Starts Saturday for Middle Eastern Kurdish rhythm) */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-400">
          {['شەممە', '١شەم', '٢شەم', '٣شەم', '٤شەم', '٥شەم', 'هەینی'].map((dayName, idx) => (
            <div key={idx} className="py-1">
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Empty Offset Pads */}
          {Array.from({ length: padOffset }).map((_, padIdx) => (
            <div key={`pad-${padIdx}`} className="min-h-[64px] sm:min-h-[82px] rounded-2xl bg-slate-50/40 dark:bg-slate-850/20 border border-transparent" />
          ))}

          {/* Days */}
          {days.map((day) => {
            let cardBg = 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300';
            if (day.status === 'no-spend') {
              cardBg = 'bg-emerald-500/10 hover:bg-emerald-500/20 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-emerald-400/50 dark:border-emerald-700/50 text-emerald-800 dark:text-emerald-200';
            } else if (day.status === 'safe') {
              cardBg = 'bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-100';
            } else if (day.status === 'moderate') {
              cardBg = 'bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/70 border-amber-200/80 dark:border-amber-800/40 text-amber-900 dark:text-amber-100';
            } else if (day.status === 'heavy') {
              cardBg = 'bg-rose-50 dark:bg-rose-950/25 hover:bg-rose-100/70 border-rose-200/80 dark:border-rose-800/40 text-rose-900 dark:text-rose-100';
            } else if (day.isFuture) {
              cardBg = 'bg-slate-50/40 dark:bg-slate-850/20 border-slate-200/40 dark:border-slate-800/40 text-slate-400 opacity-60';
            }

            const isSelected = selectedDay?.dateStr === day.dateStr;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`min-h-[64px] sm:min-h-[82px] p-1.5 sm:p-2 rounded-2xl border transition-all flex flex-col justify-between text-start cursor-pointer active:scale-97 relative overflow-hidden ${cardBg} ${
                  day.isToday ? 'ring-2 ring-teal-500 shadow-sm' : ''
                } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
              >
                {/* Top Row: Day Number & Badge */}
                <div className="flex items-center justify-between w-full">
                  <span className={`text-xs sm:text-sm font-bold font-mono ${day.isToday ? 'text-teal-600 dark:text-teal-400 font-black' : ''}`}>
                    {day.dayNumber}
                  </span>
                  {day.status === 'no-spend' && (
                    <span className="text-emerald-600 dark:text-emerald-400" title="ڕۆژی بێ-خەرجی">
                      <Star className="w-3 h-3 fill-current" />
                    </span>
                  )}
                  {day.isToday && (
                    <span className="hidden sm:inline text-[9px] px-1 py-0.2 rounded-md bg-teal-500 text-white font-bold">
                      ئەمڕۆ
                    </span>
                  )}
                </div>

                {/* Bottom Row: Spending Value or Status */}
                <div className="w-full mt-1">
                  {day.status === 'no-spend' ? (
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                      بێ-خەرجی
                    </span>
                  ) : day.totalSpent > 0 ? (
                    <div>
                      <span className="text-[10px] sm:text-xs font-black block truncate font-mono tabular-nums">
                        {fmt(day.totalSpent)}
                      </span>
                      <span className="text-[9px] text-slate-400 hidden sm:block truncate">
                        {day.txs.length} خەرجی
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 hidden sm:block">
                      -
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Transaction Details Drawer / Modal */}
      {selectedDay && (
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                selectedDay.status === 'no-spend'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-indigo-500/10 text-indigo-600'
              }`}>
                {selectedDay.status === 'no-spend' ? <Sparkles className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>خەرجییەکانی بەرواری {selectedDay.dateStr}</span>
                  {selectedDay.isToday && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500 text-white font-bold">
                      ئەمڕۆ
                    </span>
                  )}
                </h4>
                <span className="text-xs text-slate-400">
                  کۆی خەرجکراو: <b className="text-slate-800 dark:text-slate-200 font-mono font-bold">{fmt(selectedDay.totalSpent)} د.ع</b>
                  {' '}({selectedDay.txs.length} خەرجی)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenAddExpenseForDate && (
                <button
                  type="button"
                  onClick={() => onOpenAddExpenseForDate(selectedDay.dateStr)}
                  className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>زیادکردن</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of transactions for this day */}
          <div className="mt-3">
            {selectedDay.txs.length === 0 ? (
              <div className="py-6 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  ئەم ڕۆژە بە تەواوی «بێ-خەرجی» بووە!
                </p>
                <p className="text-[11px] text-slate-400">
                  هیچ بڕە پارەیەک خەرج نەکراوە و پاشەکەوت پارێزراو بووە.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedDay.txs.map((tx, idx) => {
                  const cat = CATEGORIES[tx.c];
                  const iqdVal = val(tx, defaultRate);
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <CategoryIcon name={cat?.icon || 'tag'} className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                            {cat ? getCategoryName(cat, langIndex) : 'خەرجی'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {tx.n || 'بێ تێبینی'}
                          </div>
                        </div>
                      </div>

                      <div className="text-end shrink-0">
                        <div className="font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                          {fmt(tx.a)} {tx.cu === 'U' ? '$' : 'د.ع'}
                        </div>
                        {tx.cu === 'U' && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            ≈ {fmt(iqdVal)} د.ع
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
