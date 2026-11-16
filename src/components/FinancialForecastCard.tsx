import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Sparkles,
  Sliders,
  Calendar,
  PiggyBank,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { MonthDoc, NamesConfig, RecurringExpense, DebtItem } from '../types';
import { fmt, shiftMonth, sum, val, calcMonthTotals } from '../utils/calculations';

interface FinancialForecastCardProps {
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  recurring?: RecurringExpense[];
  debts?: DebtItem[];
  langIndex: number;
  monthNames: string[];
  t: (key: string) => string;
  isLocked?: boolean;
}

export const FinancialForecastCard: React.FC<FinancialForecastCardProps> = ({
  currentMonth,
  doc,
  names,
  recurring = [],
  debts = [],
  langIndex,
  monthNames,
  t,
  isLocked = false
}) => {
  const [expenseCutPct, setExpenseCutPct] = useState<number>(10); // default 10% cut
  const [extraMonthlyIncome, setExtraMonthlyIncome] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const defaultRate = names.fx || 1500;
  const currentTotals = calcMonthTotals(doc, defaultRate);

  // Base parameters
  const baseIncome = currentTotals.inc > 0 ? currentTotals.inc : 2000000;
  const baseExpenses = currentTotals.exp > 0 ? currentTotals.exp : 1400000;

  // Monthly recurring commitments
  const monthlyRecurringTotal = sum(
    recurring.map(r => r.cu === 'U' ? r.a * defaultRate : r.a)
  );

  // 6-Month projections calculation
  const forecastMonths = useMemo(() => {
    const list = [];
    let accumulatedSavings = 0;

    for (let i = 1; i <= 6; i++) {
      const mStr = shiftMonth(currentMonth, i);
      const [y, m] = mStr.split('-');
      const mIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[mIdx] || mStr} ${y}`;

      // Adjusted calculations
      const projectedIncome = baseIncome + extraMonthlyIncome;
      // Essential reduction: we reduce discretionary part of expenses
      const reducedExpenses = Math.round(baseExpenses * (1 - expenseCutPct / 100));
      const projectedSurplus = projectedIncome - reducedExpenses;

      accumulatedSavings += Math.max(0, projectedSurplus);

      list.push({
        monthStr: mStr,
        label,
        monthIndex: i,
        income: projectedIncome,
        expenses: reducedExpenses,
        surplus: projectedSurplus,
        accumulated: accumulatedSavings
      });
    }

    return list;
  }, [currentMonth, baseIncome, baseExpenses, extraMonthlyIncome, expenseCutPct, monthNames]);

  const totalAccumulated6Months = forecastMonths[forecastMonths.length - 1]?.accumulated || 0;
  const averageMonthlySurplus = Math.round(totalAccumulated6Months / 6);
  const baselineSurplus = baseIncome - baseExpenses;
  const extraGainFromOptimization = totalAccumulated6Months - (baselineSurplus * 6);

  const maxAccumulated = Math.max(1, ...forecastMonths.map(m => m.accumulated));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/50 dark:border-teal-800/50">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>{t('fc_title')}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                {t('fc_badge')}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('fc_subtitle')}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-5">
          {/* Top KPI: 6-Month Accumulated Savings Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-teal-100 block mb-1">
                  {t('fc_accumulated_savings')}
                </span>
                <div className="text-2xl sm:text-3xl font-black tracking-tight font-mono">
                  {isLocked ? '••••••••' : `${fmt(totalAccumulated6Months)} IQD`}
                </div>
                <div className="text-xs text-teal-100 mt-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>
                    {t('fc_avg_monthly_surplus')} <b>{isLocked ? '••••••' : `${fmt(averageMonthlySurplus)} IQD`}</b>
                  </span>
                </div>
              </div>

              {extraGainFromOptimization > 0 && !isLocked && (
                <div className="bg-white/15 backdrop-blur-xs border border-white/20 p-2.5 rounded-xl text-xs sm:text-right">
                  <div className="text-teal-100 text-[11px]">{t('fc_optimization_gain')}</div>
                  <div className="font-black text-amber-200 font-mono text-sm">
                    +{fmt(extraGainFromOptimization)} IQD
                  </div>
                  <div className="text-[10px] text-teal-200">{t('fc_vs_normal')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Simulation Sliders */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sliders className="w-4 h-4 text-teal-600" />
              <span>{t('fc_lab_title')}</span>
            </div>

            {/* Slider 1: Expense Cut Percentage */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">
                  {t('fc_slider_reduce_exp')}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-bold font-mono">
                  {expenseCutPct}% ({fmt(Math.round(baseExpenses * (expenseCutPct / 100)))} IQD)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="5"
                value={expenseCutPct}
                onChange={e => setExpenseCutPct(Number(e.target.value))}
                className="w-full accent-teal-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>{t('fc_cut_0')}</span>
                <span>{t('fc_cut_15')}</span>
                <span>{t('fc_cut_35')}</span>
              </div>
            </div>

            {/* Slider 2: Extra Monthly Income */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                <span className="text-slate-600 dark:text-slate-400">
                  {t('fc_slider_extra_inc')}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold font-mono">
                  +{fmt(extraMonthlyIncome)} IQD / {t('nm')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1000000"
                step="50000"
                value={extraMonthlyIncome}
                onChange={e => setExtraMonthlyIncome(Number(e.target.value))}
                className="w-full accent-emerald-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0 IQD</span>
                <span>500,000 IQD</span>
                <span>1,000,000 IQD</span>
              </div>
            </div>
          </div>

          {/* Visual Trajectory Bar Chart */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{t('fc_sim_growth_title')}</span>
              <span className="text-[11px] text-slate-400 font-normal">{t('fc_col_accum')}</span>
            </h4>

            <div className="grid grid-cols-6 gap-2 pt-4">
              {forecastMonths.map((m, idx) => {
                const heightPct = Math.max(15, Math.round((m.accumulated / maxAccumulated) * 100));
                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5 group">
                    <div className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 group-hover:scale-110 transition">
                      {isLocked ? '••' : `${Math.round(m.accumulated / 1000000 * 10) / 10}M`}
                    </div>

                    <div className="w-full h-28 bg-slate-100 dark:bg-slate-700/60 rounded-xl flex items-end p-1 overflow-hidden">
                      <div
                        className="w-full bg-gradient-to-t from-teal-600 to-emerald-400 rounded-lg transition-all duration-500 ease-out shadow-xs"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block truncate max-w-[50px]">
                        + {idx + 1}
                      </span>
                      <span className="text-[9px] text-slate-400 block truncate max-w-[55px]">
                        {m.label.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month-by-Month Detailed Projection Table */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5">{t('fc_col_month')}</th>
                  <th className="p-2.5 text-left">{t('fc_col_proj_inc')}</th>
                  <th className="p-2.5 text-left">{t('fc_col_proj_exp')}</th>
                  <th className="p-2.5 text-left">{t('fc_col_net_sav')}</th>
                  <th className="p-2.5 text-left font-black">{t('fc_col_accum')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {forecastMonths.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold font-sans text-slate-800 dark:text-slate-200">
                      {m.label}
                    </td>
                    <td className="p-2.5 text-left text-emerald-600 dark:text-emerald-400">
                      {isLocked ? '••••••' : fmt(m.income)}
                    </td>
                    <td className="p-2.5 text-left text-rose-600 dark:text-rose-400">
                      {fmt(m.expenses)}
                    </td>
                    <td className="p-2.5 text-left text-teal-600 dark:text-teal-400 font-bold">
                      {isLocked ? '••••••' : `+${fmt(m.surplus)}`}
                    </td>
                    <td className="p-2.5 text-left font-black text-slate-900 dark:text-slate-100">
                      {isLocked ? '••••••' : fmt(m.accumulated)} IQD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Milestones & Tips */}
          <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs space-y-2">
            <div className="font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{t('fc_tips_heading')}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 pe-1">
              <li>
                {t('fc_tip1_prefix')} <b>{expenseCutPct}%</b> {t('fc_tip1_suffix')} <b>{fmt(Math.round(baseExpenses * (expenseCutPct / 100) * 6))} IQD</b>!
              </li>
              <li>
                {t('fc_tip2_text')}
              </li>
              <li>
                {t('fc_tip3_text')}
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
