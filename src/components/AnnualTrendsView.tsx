import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  PiggyBank,
  Percent,
  Calendar,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  BarChart3,
  Activity
} from 'lucide-react';
import { MonthDoc } from '../types';
import { calcMonthTotals, fmt } from '../utils/calculations';

interface AnnualTrendsViewProps {
  currentYear: string;
  currentMonth: string;
  yearDocs: MonthDoc[];
  defaultRate: number;
  isLocked: boolean;
  monthNames: string[];
  langIndex: number;
  t: (key: string) => string;
}

type TrendFilter = 'all' | 'income_spending' | 'savings_rate';

export const AnnualTrendsView: React.FC<AnnualTrendsViewProps> = ({
  currentYear,
  currentMonth,
  yearDocs,
  defaultRate,
  isLocked,
  monthNames,
  t
}) => {
  const [filterMode, setFilterMode] = useState<TrendFilter>('all');

  // Process data for all 12 months in current year
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthStr = `${currentYear}-${String(monthNum).padStart(2, '0')}`;
      const doc = yearDocs[i] || { inc: [], oi: 0, bud: [], tx: [], sv: [] };
      const totals = calcMonthTotals(doc, defaultRate);

      const income = isLocked ? 0 : Math.round(totals.inc);
      const spending = Math.round(totals.exp);
      const savings = Math.round(totals.sv);
      const savingsRate = totals.inc > 0 ? Math.min(100, Math.round((totals.sv / totals.inc) * 100)) : 0;
      const netCashFlow = income - spending - savings;
      const hasTransactions = (doc.tx && doc.tx.length > 0) || totals.inc > 0 || totals.sv > 0;

      // Localized month label
      const localizedName = monthNames[i] || `Month ${monthNum}`;
      // Short month label for clean chart X-Axis
      const shortName = localizedName.split(' ')[0] || localizedName;

      return {
        monthIndex: i,
        monthNum,
        monthStr,
        name: shortName,
        fullName: localizedName,
        income,
        spending,
        savings,
        savingsRate,
        netCashFlow,
        hasTransactions,
        isCurrent: monthStr === currentMonth
      };
    });
  }, [yearDocs, currentYear, currentMonth, defaultRate, isLocked, monthNames]);

  // Annual Totals & KPIs
  const annualStats = useMemo(() => {
    const activeMonths = monthlyData.filter(m => m.hasTransactions);
    const totalIncome = monthlyData.reduce((acc, m) => acc + m.income, 0);
    const totalSpending = monthlyData.reduce((acc, m) => acc + m.spending, 0);
    const totalSavings = monthlyData.reduce((acc, m) => acc + m.savings, 0);
    const netCashFlow = totalIncome - totalSpending - totalSavings;

    const avgMonthlySpending = activeMonths.length > 0 ? Math.round(totalSpending / activeMonths.length) : 0;
    const avgMonthlyIncome = activeMonths.length > 0 ? Math.round(totalIncome / activeMonths.length) : 0;
    const overallSavingsRate = totalIncome > 0 ? Math.min(100, Math.round((totalSavings / totalIncome) * 100)) : 0;

    // Peak and Lowest spending months
    const sortedBySpend = [...activeMonths].sort((a, b) => b.spending - a.spending);
    const peakSpendMonth = sortedBySpend[0] || null;
    const lowestSpendMonth = sortedBySpend.length > 1 ? sortedBySpend[sortedBySpend.length - 1] : null;

    // Highest savings rate month
    const sortedBySavingsRate = [...activeMonths].filter(m => m.income > 0).sort((a, b) => b.savingsRate - a.savingsRate);
    const bestSavingsMonth = sortedBySavingsRate[0] || null;

    return {
      totalIncome,
      totalSpending,
      totalSavings,
      netCashFlow,
      avgMonthlySpending,
      avgMonthlyIncome,
      overallSavingsRate,
      peakSpendMonth,
      lowestSpendMonth,
      bestSavingsMonth,
      activeMonthsCount: activeMonths.length
    };
  }, [monthlyData]);

  // Custom Chart Tooltip
  const CustomTrendsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 min-w-[210px] z-50">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {data.fullName} {currentYear}
            </span>
            {data.isCurrent && (
              <span className="text-[10px] bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                {t('active_badge') || 'ئەم مانگە'}
              </span>
            )}
          </div>

          <div className="space-y-1.5 font-mono">
            {/* Income */}
            <div className="flex items-center justify-between gap-3 text-emerald-600 dark:text-emerald-400">
              <span className="font-sans flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>{t('inc') || 'داهات'}:</span>
              </span>
              <b>{isLocked ? '••••••' : `${fmt(data.income)} IQD`}</b>
            </div>

            {/* Spending */}
            <div className="flex items-center justify-between gap-3 text-rose-500 dark:text-rose-400">
              <span className="font-sans flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>{t('exp') || 'خەرجی'}:</span>
              </span>
              <b>{fmt(data.spending)} IQD</b>
            </div>

            {/* Savings */}
            <div className="flex items-center justify-between gap-3 text-indigo-600 dark:text-indigo-400">
              <span className="font-sans flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                <span>{t('ns') || 'پاشەکەوت'}:</span>
              </span>
              <b>{fmt(data.savings)} IQD</b>
            </div>

            {/* Savings Rate */}
            <div className="flex items-center justify-between gap-3 text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-slate-700">
              <span className="font-sans flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>ڕێژەی پاشەکەوت:</span>
              </span>
              <b className="font-bold">%{data.savingsRate}</b>
            </div>

            {/* Net Cash Flow */}
            {!isLocked && (
              <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 pt-1">
                <span className="font-sans">باڵانسی ماوە:</span>
                <span className={data.netCashFlow >= 0 ? 'text-teal-600 font-bold' : 'text-red-500 font-bold'}>
                  {data.netCashFlow >= 0 ? '+' : ''}{fmt(data.netCashFlow)} IQD
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* 1. Annual Executive Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Annual Spending */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              کۆی خەرجی {currentYear}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 truncate">
            {fmt(annualStats.totalSpending)} IQD
          </div>
          <span className="text-[10px] text-slate-400 block">
            تێکڕا: {fmt(annualStats.avgMonthlySpending)} / مانگ
          </span>
        </div>

        {/* Total Annual Income */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              کۆی داهاتی {currentYear}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {isLocked ? '••••••' : `${fmt(annualStats.totalIncome)} IQD`}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isLocked ? 'پارێزراوە بە PIN' : `تێکڕا: ${fmt(annualStats.avgMonthlyIncome)} / مانگ`}
          </span>
        </div>

        {/* Total Annual Savings */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              کۆی پاشەکەوتی {currentYear}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-indigo-600 dark:text-indigo-400 truncate">
            {fmt(annualStats.totalSavings)} IQD
          </div>
          <span className="text-[10px] text-slate-400 block">
            لە هەموو ئامانجەکاندا
          </span>
        </div>

        {/* Average Annual Savings Rate */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-700 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              تێکڕای ڕێژەی پاشەکەوت
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="font-mono text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 truncate">
            %{annualStats.overallSavingsRate}
          </div>
          <span className="text-[10px] text-slate-400 block">
            {annualStats.bestSavingsMonth ? `باشترین: ${annualStats.bestSavingsMonth.name} (%${annualStats.bestSavingsMonth.savingsRate})` : 'ساڵانە'}
          </span>
        </div>
      </div>

      {/* 2. Interactive Recharts Visualizations Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
        {/* Header & View Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                ڕەوتی دارایی بەدرێژایی ساڵی {currentYear}
              </h3>
              <p className="text-[11px] text-slate-500">
                شیکاری داهات، خەرجی و ڕێژەی پاشەکەوت بۆ هەر ۱۲ مانگەکە
              </p>
            </div>
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              گشتی (هەموو)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('income_spending')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${
                filterMode === 'income_spending'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              داهات و خەرجی
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('savings_rate')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${
                filterMode === 'savings_rate'
                  ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              پاشەکەوت و ڕێژەی ٪
            </button>
          </div>
        </div>

        {/* Recharts Chart Area */}
        <div className="w-full h-80 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyData}
              margin={{ top: 15, right: 15, left: -10, bottom: 25 }}
            >
              <defs>
                {/* Income Gradient */}
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                {/* Savings Gradient */}
                <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />

              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748b' }}
                interval={0}
                stroke="#cbd5e1"
              />

              {/* Left Y Axis: Currency (IQD) */}
              <YAxis
                yAxisId="currency"
                orientation="left"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}M`
                    : val >= 1000
                    ? `${(val / 1000).toFixed(0)}k`
                    : `${val}`
                }
                stroke="#cbd5e1"
              />

              {/* Right Y Axis: Percentage (0-100%) */}
              {(filterMode === 'all' || filterMode === 'savings_rate') && (
                <YAxis
                  yAxisId="percentage"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#d97706' }}
                  tickFormatter={(val) => `%${val}`}
                  stroke="#fbbf24"
                />
              )}

              <Tooltip content={<CustomTrendsTooltip />} />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 11 }}
                formatter={(val) => {
                  if (val === 'income') return isLocked ? `${t('inc') || 'داهات'} (پارێزراو)` : (t('inc') || 'داهات');
                  if (val === 'spending') return t('exp') || 'خەرجی';
                  if (val === 'savings') return t('ns') || 'پاشەکەوت';
                  if (val === 'savingsRate') return 'ڕێژەی پاشەکەوت (%)';
                  return val;
                }}
              />

              {/* Income Area / Bar */}
              {(filterMode === 'all' || filterMode === 'income_spending') && !isLocked && (
                <Area
                  yAxisId="currency"
                  type="monotone"
                  dataKey="income"
                  name="income"
                  fill="url(#incomeGradient)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                />
              )}

              {/* Spending Bar */}
              {(filterMode === 'all' || filterMode === 'income_spending') && (
                <Bar
                  yAxisId="currency"
                  dataKey="spending"
                  name="spending"
                  fill="#f43f5e"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={38}
                />
              )}

              {/* Savings Bar */}
              {(filterMode === 'all' || filterMode === 'savings_rate') && (
                <Bar
                  yAxisId="currency"
                  dataKey="savings"
                  name="savings"
                  fill="#6366f1"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={32}
                />
              )}

              {/* Savings Rate Line (Right Axis) */}
              {(filterMode === 'all' || filterMode === 'savings_rate') && (
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="savingsRate"
                  name="savingsRate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Informational Sub-Legend & Insights */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-750 text-xs">
          <div className="flex items-center gap-4 text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span>خەرجی مانگانە</span>
            </span>
            {!isLocked && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                <span>داهات</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>پاشەکەوت</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>ڕێژەی پاشەکەوت (%)</span>
            </span>
          </div>

          {annualStats.peakSpendMonth && (
            <span className="text-[11px] text-slate-500">
              بەرزترین خەرجی: <b className="text-rose-500">{annualStats.peakSpendMonth.name} ({fmt(annualStats.peakSpendMonth.spending)} IQD)</b>
            </span>
          )}
        </div>
      </div>

      {/* 3. Detailed 12-Month Breakdown Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              خشتەی وردی داتاکانی ۱۲ مانگی ساڵی {currentYear}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            {annualStats.activeMonthsCount} مانگی تۆمارکراو
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">
                <th className="py-2.5 text-start font-semibold">مانگ</th>
                <th className="py-2.5 text-end font-semibold">داهات</th>
                <th className="py-2.5 text-end font-semibold">خەرجی</th>
                <th className="py-2.5 text-end font-semibold">پاشەکەوت</th>
                <th className="py-2.5 text-end font-semibold">ڕێژەی پاشەکەوت</th>
                <th className="py-2.5 text-end font-semibold">باڵانسی ماوە</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {monthlyData.map((m) => (
                <tr
                  key={m.monthStr}
                  className={`transition ${
                    m.isCurrent
                      ? 'bg-teal-50/60 dark:bg-teal-950/40 font-bold'
                      : m.hasTransactions
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-750'
                      : 'opacity-40'
                  }`}
                >
                  <td className="py-2.5 font-sans font-medium text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <span>{m.fullName}</span>
                    {m.isCurrent && (
                      <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.2 rounded-full font-sans">
                        ئەم مانگە
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-end text-emerald-600 dark:text-emerald-400">
                    {isLocked ? '••••••' : m.income > 0 ? `${fmt(m.income)}` : '0'}
                  </td>
                  <td className="py-2.5 text-end text-rose-600 dark:text-rose-400">
                    {m.spending > 0 ? `${fmt(m.spending)}` : '0'}
                  </td>
                  <td className="py-2.5 text-end text-indigo-600 dark:text-indigo-400">
                    {m.savings > 0 ? `${fmt(m.savings)}` : '0'}
                  </td>
                  <td className="py-2.5 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.min(100, m.savingsRate)}%` }}
                        />
                      </div>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        %{m.savingsRate}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-end font-semibold">
                    {isLocked ? (
                      '••••••'
                    ) : (
                      <span
                        className={
                          m.netCashFlow > 0
                            ? 'text-teal-600 dark:text-teal-400'
                            : m.netCashFlow < 0
                            ? 'text-red-500'
                            : 'text-slate-400'
                        }
                      >
                        {m.netCashFlow > 0 ? '+' : ''}
                        {fmt(m.netCashFlow)} IQD
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
