import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  TrendingUp,
  TrendingDown,
  Scale,
  BrainCircuit,
  ArrowRight,
  Info,
  Calendar,
  Wallet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';
import { fmt, sum } from '../utils/calculations';

export interface ProposedCategoryBudget {
  index: number;
  amount: number;
  reason?: string;
}

export interface AIBudgetSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  monthsAnalyzed: string[];
  currentBudgets: number[];
  threeMonthAverages: number[];
  initialProposedBudgets: number[];
  explanation: string;
  highlights: string[];
  isLoading: boolean;
  income: number;
  isIncomeLocked?: boolean;
  langIndex: number;
  t: (key: string) => string;
  onApply: (finalBudgets: number[]) => void;
  onReanalyze?: () => void;
}

export const AIBudgetSuggestionModal: React.FC<AIBudgetSuggestionModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  monthsAnalyzed,
  currentBudgets,
  threeMonthAverages,
  initialProposedBudgets,
  explanation,
  highlights,
  isLoading,
  income,
  isIncomeLocked = false,
  langIndex,
  t,
  onApply,
  onReanalyze
}) => {
  const [editableBudgets, setEditableBudgets] = useState<number[]>([]);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (initialProposedBudgets && initialProposedBudgets.length === CATEGORIES.length) {
      setEditableBudgets([...initialProposedBudgets]);
    } else {
      setEditableBudgets([...currentBudgets]);
    }
    setAppliedSuccess(false);
  }, [initialProposedBudgets, currentBudgets, isOpen]);

  if (!isOpen) return null;

  const currentTotal = sum(currentBudgets);
  const avg3Total = sum(threeMonthAverages);
  const proposedTotal = sum(editableBudgets);
  const diffFromCurrent = proposedTotal - currentTotal;
  const projectedSavings = income > 0 ? income - proposedTotal : 0;
  const projectedSavingsRate = income > 0 ? Math.round((projectedSavings / income) * 100) : 0;

  const handleBudgetChange = (idx: number, val: number) => {
    const updated = [...editableBudgets];
    updated[idx] = Math.max(0, val);
    setEditableBudgets(updated);
  };

  const handleApplyAll = () => {
    onApply(editableBudgets);
    setAppliedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-850 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                  {t('ai_bud_modal_title')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 font-mono">
                  {currentMonth}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('ai_bud_modal_desc')} ({monthsAnalyzed.join(', ')})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-teal-600 absolute inset-0 m-auto" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                {t('ai_bud_analyzing')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                {t('ai_bud_deep_analyzing')}
              </p>
            </div>
          ) : (
            <>
              {/* Summary 3 KPIs Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 3-Month Average Spend */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                    {t('ai_bud_avg3')}
                  </span>
                  <b className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block truncate">
                    {fmt(avg3Total)} IQD
                  </b>
                </div>

                {/* Current Budget */}
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">
                    {t('ai_bud_current')}
                  </span>
                  <b className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 block truncate">
                    {fmt(currentTotal)} IQD
                  </b>
                </div>

                {/* Proposed Budget */}
                <div className="bg-teal-50 dark:bg-teal-950/40 p-3 rounded-2xl border border-teal-200 dark:border-teal-800/70 text-center">
                  <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 block mb-0.5">
                    {t('ai_bud_total_proposed')}
                  </span>
                  <b className="text-sm sm:text-base font-black text-teal-800 dark:text-teal-100 block truncate">
                    {fmt(proposedTotal)} IQD
                  </b>
                </div>

                {/* Projected Savings Margin */}
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                    {t('ai_bud_proj_savings')}
                  </span>
                  <b className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-100 block truncate">
                    {isIncomeLocked || income <= 0 ? (
                      diffFromCurrent <= 0 ? (
                        <span className="text-emerald-600">{t('ai_bud_saving_action')}</span>
                      ) : (
                        <span className="text-slate-500">{t('ai_bud_review_action')}</span>
                      )
                    ) : (
                      `${projectedSavingsRate}% (${fmt(projectedSavings)})`
                    )}
                  </b>
                </div>
              </div>

              {/* AI Explanation & Highlights Banner */}
              <div className="bg-gradient-to-br from-teal-50 via-emerald-50/50 to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 rounded-2xl p-4 border border-teal-200/80 dark:border-teal-800/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-teal-900 dark:text-teal-200 mb-1">
                      {t('ai_bud_logic_strategy')}
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      {explanation}
                    </p>
                  </div>
                </div>

                {highlights && highlights.length > 0 && (
                  <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      {t('ai_bud_highlights_title')}:
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                      {highlights.map((h, i) => (
                        <li
                          key={i}
                          className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900 flex items-start gap-1.5"
                        >
                          <span className="w-4 h-4 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="leading-snug">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Category Breakdown Table / Editor */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t('ai_bud_edit_details')}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {CATEGORIES.length} {t('cat_count_unit')}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto custom-scrollbar">
                  {CATEGORIES.map((cat, i) => {
                    const avg = threeMonthAverages[i] || 0;
                    const cur = currentBudgets[i] || 0;
                    const proposed = editableBudgets[i] || 0;
                    const diff = proposed - cur;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-750/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        {/* Category Name & Icon */}
                        <div className="flex items-center gap-2.5 min-w-[180px]">
                          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <CategoryIcon name={cat.icon} className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {getCategoryName(cat, langIndex)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {t('ai_bud_avg3')}: {fmt(avg)} IQD
                            </span>
                          </div>
                        </div>

                        {/* Metrics: Current vs Proposed Input */}
                        <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end flex-1">
                          <div className="text-center min-w-[70px]">
                            <span className="text-[10px] text-slate-400 block mb-0.5">{t('ai_bud_current')}:</span>
                            <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                              {fmt(cur)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold block sm:hidden">
                              {t('ai_bud_proposed')}:
                            </span>
                            <div className="relative">
                              <input
                                type="number"
                                step="5000"
                                min="0"
                                value={proposed || ''}
                                onChange={(e) => handleBudgetChange(i, +e.target.value)}
                                className="w-28 sm:w-32 py-1.5 px-2 bg-slate-50 dark:bg-slate-900 border border-teal-300 dark:border-teal-700 rounded-xl font-mono font-bold text-xs text-center text-teal-900 dark:text-teal-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <span className="absolute left-2 top-1.5 text-[9px] text-slate-400 font-sans pointer-events-none">
                                IQD
                              </span>
                            </div>
                          </div>

                          {/* Difference tag */}
                          <div className="min-w-[65px] text-end">
                            {diff === 0 ? (
                              <span className="text-[10px] text-slate-400">—</span>
                            ) : diff > 0 ? (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end gap-0.5">
                                <TrendingUp className="w-3 h-3" />
                                +{fmt(diff)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                                <TrendingDown className="w-3 h-3" />
                                {fmt(diff)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {appliedSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-bounce">
                <CheckCircle2 className="w-4 h-4" />
                {t('ai_bud_applied_success')}
              </span>
            ) : (
              <span>
                {t('ai_bud_total_proposed')}: <b className="text-teal-700 dark:text-teal-300 font-mono">{fmt(proposedTotal)} IQD</b>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onReanalyze && !isLoading && (
              <button
                type="button"
                onClick={onReanalyze}
                className="py-2 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('fhs_reanalyze_btn')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition cursor-pointer flex-1 sm:flex-none"
            >
              {t('cancel')}
            </button>

            <button
              type="button"
              disabled={isLoading || appliedSuccess}
              onClick={handleApplyAll}
              className="py-2.5 px-5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition cursor-pointer flex-1 sm:flex-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{t('ai_bud_apply_btn')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
