import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MonthDoc, NamesConfig } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { calcMonthTotals, fmt, sum } from '../utils/calculations';
import { CategoryIcon } from './CategoryIcon';

interface ReportsChartsSectionProps {
  currentYear: string;
  currentMonth: string;
  doc: MonthDoc;
  yearDocs: MonthDoc[];
  defaultRate: number;
  isLocked: boolean;
  langIndex: number;
  monthNames: string[];
  t: (key: string) => string;
}

type CategoryFilter = 'all' | 'over_budget' | 'near_limit' | 'safe' | 'top';

export const ReportsChartsSection: React.FC<ReportsChartsSectionProps> = ({
  currentYear,
  currentMonth,
  doc,
  yearDocs,
  defaultRate,
  isLocked,
  langIndex,
  monthNames,
  t
}) => {
  // Current month index (0-11)
  const initialMonthIdx = Math.max(0, parseInt(currentMonth.slice(5, 7), 10) - 1);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(initialMonthIdx);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  // Active document for selected month drill-down
  const activeMonthDoc = yearDocs[selectedMonthIdx] || doc;
  const activeMonthStr = `${currentYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const activeTotals = useMemo(
    () => calcMonthTotals(activeMonthDoc, defaultRate),
    [activeMonthDoc, defaultRate]
  );

  // 1. Prepare 12-Month Spending vs Budget Trajectory Data
  const monthlyTrendData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDoc = yearDocs[i] || { inc: [], oi: 0, bud: [], tx: [], sv: [] };
      const totals = calcMonthTotals(monthDoc, defaultRate);
      const totalBudget = sum(monthDoc.bud || []);
      const totalSpent = Math.round(totals.exp);
      const variance = totalBudget > 0 ? totalBudget - totalSpent : 0;
      const isOver = totalBudget > 0 && totalSpent > totalBudget;

      return {
        monthIndex: i,
        monthName: monthNames[i] || `${currentYear}-${String(i + 1).padStart(2, '0')}`,
        shortMonth: (monthNames[i] || `${i + 1}`).slice(0, 7),
        spent: isLocked ? 0 : totalSpent,
        budget: isLocked ? 0 : totalBudget,
        variance,
        isOverBudget: isOver,
        adherenceRatio: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : null
      };
    });
  }, [yearDocs, defaultRate, isLocked, monthNames, currentYear]);

  // 2. Prepare Category Adherence Data for the selected month
  const categoryAdherenceData = useMemo(() => {
    const categoriesWithData = CATEGORIES.map((cat, idx) => {
      const spent = Math.round(activeTotals.sp[idx] || 0);
      const budget = Math.round(activeMonthDoc.bud?.[idx] || 0);
      const catName = getCategoryName(cat, langIndex) || `Category ${idx + 1}`;

      let status: 'over_budget' | 'near_limit' | 'safe' | 'no_budget' = 'no_budget';
      let adherencePct: number | null = null;
      let barColor = '#64748b'; // default slate

      if (budget > 0) {
        adherencePct = Math.round((spent / budget) * 100);
        if (spent > budget) {
          status = 'over_budget';
          barColor = '#ef4444'; // Red
        } else if (spent / budget >= 0.8) {
          status = 'near_limit';
          barColor = '#f59e0b'; // Amber
        } else {
          status = 'safe';
          barColor = '#10b981'; // Emerald Green
        }
      } else if (spent > 0) {
        barColor = '#0284c7'; // Blue for spent without budget
      }

      return {
        index: idx,
        category: cat,
        name: catName,
        spent: isLocked ? 0 : spent,
        budget: isLocked ? 0 : budget,
        adherencePct,
        status,
        color: barColor,
        variance: budget > 0 ? budget - spent : -spent
      };
    }).filter(c => c.spent > 0 || c.budget > 0);

    // Apply Filter
    if (categoryFilter === 'over_budget') {
      return categoriesWithData.filter(c => c.status === 'over_budget');
    }
    if (categoryFilter === 'near_limit') {
      return categoriesWithData.filter(c => c.status === 'near_limit');
    }
    if (categoryFilter === 'safe') {
      return categoriesWithData.filter(c => c.status === 'safe');
    }
    if (categoryFilter === 'top') {
      return [...categoriesWithData].sort((a, b) => b.spent - a.spent).slice(0, 8);
    }
    return categoriesWithData;
  }, [activeTotals, activeMonthDoc, langIndex, isLocked, categoryFilter]);

  // 3. Adherence KPI Metrics
  const kpiMetrics = useMemo(() => {
    let budgetedCategories = 0;
    let overBudgetCategories = 0;
    let safeCategories = 0;
    let totalOverrunAmount = 0;
    let totalBudgeted = sum(activeMonthDoc.bud || []);
    let totalSpent = activeTotals.exp;

    CATEGORIES.forEach((_, idx) => {
      const budget = activeMonthDoc.bud?.[idx] || 0;
      const spent = activeTotals.sp[idx] || 0;
      if (budget > 0) {
        budgetedCategories++;
        if (spent > budget) {
          overBudgetCategories++;
          totalOverrunAmount += spent - budget;
        } else {
          safeCategories++;
        }
      }
    });

    const overallRatio = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
    const adherenceHealth =
      overallRatio > 100 ? 'danger' : overallRatio >= 85 ? 'warning' : 'safe';

    return {
      totalBudgeted,
      totalSpent,
      budgetedCategories,
      overBudgetCategories,
      safeCategories,
      totalOverrunAmount,
      overallRatio,
      adherenceHealth
    };
  }, [activeMonthDoc, activeTotals]);

  return (
    <div className="space-y-5 pb-6">
      {/* 1. Header Card with KPI Badges */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>{t('charts_title') || 'شیکاری گرافیکی خەرجی و پابەندبوون بە بودجە'}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
                  {currentYear}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {t('charts_desc') || 'بەراوردکردنی ڕاستەوخۆی خەرجییەکان لەگەڵ بودجەی دیاریکراو و ئاستی پابەندبوون'}
              </p>
            </div>
          </div>

          {/* Month Selector for drill-down */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('charts_view_month') || 'مانگی شیکاری:'}
            </span>
            <select
              value={selectedMonthIdx}
              onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
              className="py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Adherence KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Overall Ratio */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              kpiMetrics.adherenceHealth === 'danger'
                ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200'
                : kpiMetrics.adherenceHealth === 'warning'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
              <span>{t('charts_kpi_adherence') || 'ڕێژەی خەرجکردنی بودجە'}</span>
              {kpiMetrics.adherenceHealth === 'danger' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </div>
            <div className="text-base sm:text-lg font-bold font-mono">
              %{kpiMetrics.overallRatio}
            </div>
            <span className="text-[10px] opacity-80 block truncate">
              {kpiMetrics.adherenceHealth === 'danger'
                ? 'تێپەڕیوە لە بودجە!'
                : kpiMetrics.adherenceHealth === 'warning'
                ? 'نزیک لە تەواوبوون'
                : 'لە سنووری سەلامەتدایە'}
            </span>
          </div>

          {/* 2. Total Budget vs Spent */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              {t('charts_kpi_budget_allocated') || 'کۆی بودجەی دیاریکراو'}
            </span>
            <div className="text-sm sm:text-base font-bold font-mono text-slate-800 dark:text-slate-100 truncate">
              {isLocked ? '••••••' : `${fmt(kpiMetrics.totalBudgeted)} IQD`}
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              خەرجکراو: {isLocked ? '•••' : `${fmt(kpiMetrics.totalSpent)} IQD`}
            </span>
          </div>

          {/* 3. Categories Adherence Status */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              {t('charts_kpi_categories_status') || 'پۆلەکان (سەلامەت / بەزێنراو)'}
            </span>
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold font-mono">
              <span className="text-emerald-600 dark:text-emerald-400">
                {kpiMetrics.safeCategories} {t('safe') || 'پارێزراو'}
              </span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-red-500">
                {kpiMetrics.overBudgetCategories} {t('over') || 'تێپەڕیو'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              لە کۆی {kpiMetrics.budgetedCategories} پۆلی بودجەدار
            </span>
          </div>

          {/* 4. Total Overrun Amount */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-500 block mb-1">
              {t('charts_kpi_overrun') || 'کۆی بڕی زیادەڕۆیی'}
            </span>
            <div
              className={`text-sm sm:text-base font-bold font-mono truncate ${
                kpiMetrics.totalOverrunAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'
              }`}
            >
              {isLocked
                ? '••••••'
                : kpiMetrics.totalOverrunAmount > 0
                ? `+${fmt(kpiMetrics.totalOverrunAmount)} IQD`
                : '0 IQD (هیچ زیادەڕۆییەک نییە)'}
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              {kpiMetrics.totalOverrunAmount > 0 ? 'پێویستی بە کۆنتڕۆڵکردنە' : 'بودجە پارێزراوە'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Macro Chart: 12-Month Spending vs Budget Trajectory */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{t('charts_trend_title') || 'ڕەوتی مانگانەی خەرجی بەرامبەر بودجە (١٢ مانگ)'}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {t('charts_trend_desc') || 'بەراوردی خەرجی ڕاستەقینە (ستوون) بەرامبەر هێڵی بودجەی دیاریکراو (هێڵ)'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-3 rounded-xs bg-teal-500 shrink-0" />
              <span>خەرجکراو (Actual)</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-3 h-0.5 bg-rose-500 shrink-0" />
              <span>بودجە (Budget Limit)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyTrendData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  setSelectedMonthIdx(e.activePayload[0].payload.monthIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
              <XAxis
                dataKey="shortMonth"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8', opacity: 0.3 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#94a3b8', opacity: 0.3 }}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const item = payload[0].payload;
                  return (
                    <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 text-start font-sans">
                      <div className="font-bold border-b border-slate-700/80 pb-1 flex items-center justify-between gap-3">
                        <span>{item.monthName}</span>
                        {item.budget > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold font-mono ${
                              item.isOverBudget ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                            }`}
                          >
                            %{item.adherenceRatio}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">خەرجکراو:</span>
                        <b className="font-mono text-teal-300 font-bold">{fmt(item.spent)} IQD</b>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-400">بودجە:</span>
                        <b className="font-mono text-rose-300 font-bold">{fmt(item.budget)} IQD</b>
                      </div>
                      {item.budget > 0 && (
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                          <span className="text-slate-400">جیاوازی:</span>
                          <b
                            className={`font-mono font-bold ${
                              item.isOverBudget ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {item.variance >= 0 ? `+${fmt(item.variance)} ماوە` : `${fmt(item.variance)} زیادەڕۆیی`}
                          </b>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 italic pt-0.5">
                        کلیک بکە بۆ بینینی وردەکاری ئەم مانگە
                      </div>
                    </div>
                  );
                }}
              />
              {/* Spending Bar with highlight on selected month */}
              <Bar dataKey="spent" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {monthlyTrendData.map((entry, index) => {
                  const isSelected = index === selectedMonthIdx;
                  const isOver = entry.isOverBudget;
                  return (
                    <Cell
                      key={`bar-${index}`}
                      fill={
                        isSelected
                          ? '#0d9488' // Active selected: teal-600
                          : isOver
                          ? '#f87171' // Over budget: soft red
                          : '#14b8a6' // Regular teal-500
                      }
                      stroke={isSelected ? '#042f2e' : 'none'}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                })}
              </Bar>
              {/* Budget Benchmark Line */}
              <Line
                type="monotone"
                dataKey="budget"
                stroke="#e11d48"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={{ r: 3, fill: '#e11d48' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Micro Chart: Category Budget Adherence Comparison */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>
                  {t('charts_cat_adherence_title') || 'پابەندبوونی پۆلەکان بە بودجە'} ({monthNames[selectedMonthIdx]})
                </span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold">
                {categoryAdherenceData.length} پۆل
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              ڕەنگی سەوز (پارێزراو &le; ٨٠٪)، زەرد (نزیک لە سنوور ٨١-١٠٠٪)، سوور (تێپەڕیو لە بودجە &gt; ١٠٠٪)
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'all'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              هەموو ({CATEGORIES.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('over_budget')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                categoryFilter === 'over_budget'
                  ? 'bg-red-600 text-white font-bold shadow-xs'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>تێپەڕیو ({kpiMetrics.overBudgetCategories})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('near_limit')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'near_limit'
                  ? 'bg-amber-500 text-white font-bold shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              نزیک سنوور
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('safe')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'safe'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              پارێزراو
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('top')}
              className={`py-1 px-2.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'top'
                  ? 'bg-teal-600 text-white font-bold shadow-xs'
                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
              }`}
            >
              ٨ خەرجکراوترین
            </button>
          </div>
        </div>

        {/* Dynamic Category Comparative Bars */}
        {categoryAdherenceData.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
            هیچ پۆلێک لەم فلتەرەدا نەدۆزرایەوە بۆ مانگی {monthNames[selectedMonthIdx]}.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Horizontal Bar Chart representation for high readability */}
            <div className="h-80 w-full pt-1" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryAdherenceData.slice(0, 12)}
                  margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 text-start font-sans border border-slate-700">
                          <div className="font-bold border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                            <span>{d.name}</span>
                            {d.adherencePct !== null && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold font-mono ${
                                  d.status === 'over_budget'
                                    ? 'bg-red-500'
                                    : d.status === 'near_limit'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              >
                                %{d.adherencePct}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">خەرجکراو:</span>
                            <b className="font-mono text-teal-300">{fmt(d.spent)} IQD</b>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-slate-400">بودجە:</span>
                            <b className="font-mono text-slate-300">
                              {d.budget > 0 ? `${fmt(d.budget)} IQD` : 'دیاری نەکراوە'}
                            </b>
                          </div>
                          {d.budget > 0 && (
                            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
                              <span className="text-slate-400">جیاوازی:</span>
                              <b
                                className={`font-mono font-bold ${
                                  d.variance >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {d.variance >= 0 ? `+${fmt(d.variance)} ماوە` : `${fmt(d.variance)} زیادەڕۆیی`}
                              </b>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="spent" name="خەرجکراو" radius={[4, 4, 0, 0]}>
                    {categoryAdherenceData.map((entry, idx) => (
                      <Cell key={`cat-cell-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="budget" name="بودجە" fill="#cbd5e1" radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List breakdown with progress tracks */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 pt-2">
              {categoryAdherenceData.map((item) => {
                const isOver = item.status === 'over_budget';
                const isNear = item.status === 'near_limit';
                const pct = item.adherencePct ?? 0;

                return (
                  <div key={item.index} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
                        <CategoryIcon name={item.category.icon} className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <b className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.name}
                          </b>
                          {item.budget > 0 && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md font-mono ${
                                isOver
                                  ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'
                                  : isNear
                                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              %{pct}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {fmt(item.spent)} / {item.budget > 0 ? `${fmt(item.budget)} IQD` : 'بێ بودجە'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Status */}
                    <div className="w-full sm:w-56 space-y-1">
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, pct)}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>
                          {item.budget > 0
                            ? item.variance >= 0
                              ? `ماوە: ${fmt(item.variance)} IQD`
                              : `زیادەڕۆیی: ${fmt(Math.abs(item.variance))} IQD`
                            : 'بودجە دیاری نەکراوە'}
                        </span>
                        <span className="font-bold inline-flex items-center gap-1">
                          {isOver ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-rose-500" />
                              <span>بەزێنراو</span>
                            </>
                          ) : isNear ? (
                            <>
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>ئاگاداری</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>ئاسایی</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
