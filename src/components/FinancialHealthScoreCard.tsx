import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Scale,
  PiggyBank,
  CheckCircle2,
  Sparkles,
  Lightbulb,
  Check,
  RefreshCw,
  Target,
  ArrowDownCircle,
  HelpCircle
} from 'lucide-react';
import { MonthDoc, NamesConfig, DebtItem, SavingsGoal } from '../types';
import { fmt, calcMonthTotals, calc503020, sum, val } from '../utils/calculations';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { LANGUAGES } from '../constants/translations';

export interface AiSavingTip {
  title: string;
  action: string;
  category?: string;
  impact?: string;
}

export interface AiFinancialHealthAnalysis {
  spendingPatternAnalysis: string;
  tips: AiSavingTip[];
  timestamp?: number;
}

export interface FinancialHealthScoreCardProps {
  currentMonth: string;
  doc: MonthDoc;
  prevDoc?: MonthDoc | null;
  names: NamesConfig;
  debts?: DebtItem[];
  goals?: SavingsGoal[];
  t: (key: string) => string;
  isLocked?: boolean;
  langIndex?: number;
}

export const FinancialHealthScoreCard: React.FC<FinancialHealthScoreCardProps> = ({
  currentMonth,
  doc,
  prevDoc,
  names,
  debts = [],
  goals = [],
  t,
  isLocked = false,
  langIndex = 0
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<AiFinancialHealthAnalysis | null>(null);
  const [appliedTips, setAppliedTips] = useState<Record<number, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultRate = names.fx || 1500;
  const totals = calcMonthTotals(doc, defaultRate);
  const prevTotals = prevDoc ? calcMonthTotals(prevDoc, defaultRate) : null;
  const ruleBreakdown = calc503020(totals);

  // Category ranking
  const categoryRanking = totals.sp
    .map((amount, idx) => ({ idx, amount }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Top transactions
  const topTx = [...(doc.tx || [])]
    .map(tx => ({ tx, totalIQD: val(tx, defaultRate) }))
    .sort((a, b) => b.totalIQD - a.totalIQD)
    .slice(0, 3);

  // Pillar 1: Savings Rate (25 points max)
  const savingsRatePct = Math.round((totals.savingsRate || 0) * 100);
  let p1Score = 0;
  if (savingsRatePct >= 20) p1Score = 25;
  else if (savingsRatePct >= 10) p1Score = 18;
  else if (savingsRatePct >= 5) p1Score = 12;
  else if (savingsRatePct > 0) p1Score = 6;
  else p1Score = 0;

  // Pillar 2: Budget Discipline (25 points max)
  const budgetedCats = CATEGORIES.filter((_, i) => (doc.bud[i] || 0) > 0);
  const adheredCats = budgetedCats.filter(
    (_, i) => (totals.sp[i] || 0) <= (doc.bud[i] || 0)
  );
  let p2Score = 25;
  if (budgetedCats.length > 0) {
    const adherenceRatio = adheredCats.length / budgetedCats.length;
    p2Score = Math.round(adherenceRatio * 25);
  } else {
    p2Score = 14;
  }

  // Pillar 3: Needs vs Wants 50/30 balance (25 points max)
  let p3Score = 0;
  if (ruleBreakdown.needsPct <= 50) p3Score = 25;
  else if (ruleBreakdown.needsPct <= 60) p3Score = 18;
  else if (ruleBreakdown.needsPct <= 75) p3Score = 10;
  else p3Score = 4;

  // Pillar 4: Debt & Emergency Cushion (25 points max)
  const activeDebtsTotal = sum(
    debts
      .filter(d => d.k === 'b' && d.a > (d.p || 0))
      .map(d => {
        const remaining = d.a - (d.p || 0);
        return d.cu === 'U' ? remaining * defaultRate : remaining;
      })
  );
  const monthlyInc = totals.inc > 0 ? totals.inc : 1500000;
  const debtToIncome = activeDebtsTotal / monthlyInc;

  let p4Score = 25;
  if (debtToIncome === 0) p4Score = 25;
  else if (debtToIncome < 1) p4Score = 20;
  else if (debtToIncome < 2.5) p4Score = 14;
  else p4Score = 8;

  // Total Score (0 - 100)
  const totalScore = Math.min(100, Math.max(0, p1Score + p2Score + p3Score + p4Score));

  // Determine Badge & Status
  let statusBadge = {
    title: t('fhs_status_excellent_title'),
    color: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
    icon: Award,
    desc: t('fhs_status_excellent_desc')
  };

  if (totalScore < 50) {
    statusBadge = {
      title: t('fhs_status_attention_title'),
      color: 'text-rose-700 dark:text-rose-300',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      icon: AlertTriangle,
      desc: t('fhs_status_attention_desc')
    };
  } else if (totalScore < 75) {
    statusBadge = {
      title: t('fhs_status_fair_title'),
      color: 'text-amber-700 dark:text-amber-300',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      icon: Activity,
      desc: t('fhs_status_fair_desc')
    };
  }

  const StatusIcon = statusBadge.icon;

  // Load cached AI analysis & applied tips on month change
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`fhs_ai_analysis_${currentMonth}`);
      if (cached) {
        setAnalysisData(JSON.parse(cached));
      } else {
        setAnalysisData(null);
      }

      const cachedApplied = localStorage.getItem(`fhs_applied_tips_${currentMonth}`);
      if (cachedApplied) {
        setAppliedTips(JSON.parse(cachedApplied));
      } else {
        setAppliedTips({});
      }
    } catch {
      // ignore
    }
  }, [currentMonth]);

  // Toggle applied state of a tip
  const handleToggleTip = (index: number) => {
    const updated = { ...appliedTips, [index]: !appliedTips[index] };
    setAppliedTips(updated);
    try {
      localStorage.setItem(`fhs_applied_tips_${currentMonth}`, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Generate fallback tips in case AI fails or is offline
  const generateSmartFallback = (): AiFinancialHealthAnalysis => {
    const topCatName = categoryRanking[0]
      ? getCategoryName(categoryRanking[0].idx, langIndex)
      : t('bycat');
    const topCatSpent = categoryRanking[0]?.amount || 0;
    const secondCatName = categoryRanking[1]
      ? getCategoryName(categoryRanking[1].idx, langIndex)
      : t('bycat');

    const patternText = totals.exp === 0
      ? t('fhs_no_expenses_yet')
      : `${t('bycat')}: ${topCatName} (${fmt(topCatSpent)} IQD) • ${t('ns')}: ${savingsRatePct}%`;

    const tips: AiSavingTip[] = [
      {
        title: `${t('fhs_tip_control_top_title')}: ${topCatName}`,
        action: `${t('fhs_tip_control_top_title')} (${topCatName})`,
        category: topCatName,
        impact: `~10% (${fmt(Math.round(topCatSpent * 0.1))} IQD)`
      },
      {
        title: `${t('fhs_tip_review_second_title')}: ${secondCatName}`,
        action: `${t('fhs_tip_review_second_title')} (${secondCatName})`,
        category: secondCatName,
        impact: t('fhs_high_savings')
      },
      {
        title: t('fhs_tip_automate_savings_title'),
        action: t('fhs_tip_automate_savings_title'),
        category: t('ns'),
        impact: `+10% ${t('ns')}`
      }
    ];

    return {
      spendingPatternAnalysis: patternText,
      tips,
      timestamp: Date.now()
    };
  };

  // Trigger AI Analysis
  const handleRunAiAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const topCategories = categoryRanking.slice(0, 5).map(c => ({
        category: getCategoryName(c.idx, langIndex) || `Cat #${c.idx}`,
        spentIQD: c.amount,
        budgetIQD: doc.bud[c.idx] || 0
      }));

      const topPurchases = topTx.map(
        t => `${getCategoryName(t.tx.c, langIndex)}: ${fmt(t.totalIQD)} IQD ${t.tx.n ? `(${t.tx.n})` : ''}`
      );

      const monthChangePct = prevTotals && prevTotals.exp > 0
        ? Math.round(((totals.exp - prevTotals.exp) / prevTotals.exp) * 100)
        : 0;

      const payload = {
        month: currentMonth,
        totalIncomeIQD: isLocked ? undefined : totals.inc,
        totalExpensesIQD: totals.exp,
        savingsIQD: totals.sv,
        savingsRatePct,
        needsPct: ruleBreakdown.needsPct,
        wantsPct: ruleBreakdown.wantsPct,
        savingsPct: ruleBreakdown.savingsPct,
        topCategories,
        previousMonthExpensesIQD: prevTotals ? prevTotals.exp : undefined,
        monthChangePct,
        activeDebtsTotal,
        topPurchases
      };

      const targetLang = LANGUAGES[langIndex]?.english || 'Kurdish Sorani';

      const res = await fetch('/api/financial-health-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: payload,
          language: targetLang
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const json = await res.json();
      if (json.spendingPatternAnalysis && Array.isArray(json.tips)) {
        const result: AiFinancialHealthAnalysis = {
          spendingPatternAnalysis: json.spendingPatternAnalysis,
          tips: json.tips.slice(0, 3),
          timestamp: Date.now()
        };
        setAnalysisData(result);
        localStorage.setItem(`fhs_ai_analysis_${currentMonth}`, JSON.stringify(result));
      } else {
        throw new Error('Invalid JSON format from AI');
      }
    } catch (err: any) {
      console.warn('AI analysis fallback activated:', err);
      // Fallback seamlessly to local intelligent analyzer
      const fallback = generateSmartFallback();
      setAnalysisData(fallback);
      try {
        localStorage.setItem(`fhs_ai_analysis_${currentMonth}`, JSON.stringify(fallback));
      } catch {
        // ignore
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xs border border-slate-200 dark:border-slate-700 transition-all overflow-hidden relative">
      {/* Decorative Gradient Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 dark:bg-teal-400/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header Bar */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-slate-100">
                {t('fhs_card_title')}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 font-mono border border-purple-200/50 dark:border-purple-800/50">
                {isLocked ? '••' : `${totalScore}/100`}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{t('fhs_ai_badge')}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('fhs_card_desc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Toggle card"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
        >
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-5">
          {/* Main Health Status Hero Banner */}
          <div className={`p-4 rounded-2xl border ${statusBadge.bg} transition-all`}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 text-center sm:text-right">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 font-mono">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {isLocked ? '••' : totalScore}
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans">{t('fhs_score_of_100')}</span>
                </div>
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 mb-1">
                    <StatusIcon className={`w-4 h-4 ${statusBadge.color}`} />
                    <span className={`text-sm font-black ${statusBadge.color}`}>
                      {statusBadge.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed">
                    {statusBadge.desc}
                  </p>
                </div>
              </div>

              {/* Quick Metrics Tags */}
              <div className="flex sm:flex-col gap-2 text-center sm:text-left shrink-0">
                <div className="bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <span className="text-[10px] text-slate-500 block">{t('ns')}:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {isLocked ? '••%' : `${savingsRatePct}%`}
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <span className="text-[10px] text-slate-500 block">{t('fhs_p2_title')}:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {ruleBreakdown.needsPct}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Health Pillars Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* Pillar 1: Savings */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                  <PiggyBank className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{t('fhs_savings_cushion')}</span>
                </span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">{p1Score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(p1Score / 25) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                {savingsRatePct >= 20 ? t('fhs_high_savings') : `${savingsRatePct}% (${t('adv_target_label')}: 20%)`}
              </span>
            </div>

            {/* Pillar 2: Budget Discipline */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="truncate">{t('fhs_budget_discipline')}</span>
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{p2Score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(p2Score / 25) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                {budgetedCats.length > 0 ? `${adheredCats.length}/${budgetedCats.length} ${t('fhs_in_limit')}` : t('pdf_not_set')}
              </span>
            </div>

            {/* Pillar 3: Needs vs Wants */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                  <Scale className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <span className="truncate">{t('fhs_needs_balance')}</span>
                </span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0">{p3Score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(p3Score / 25) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                {t('fhs_p2_title')}: {ruleBreakdown.needsPct}%
              </span>
            </div>

            {/* Pillar 4: Debt Health */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1 font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 truncate">
                  <Activity className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{t('fhs_debt_health')}</span>
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">{p4Score}/25</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(p4Score / 25) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500 block truncate">
                {activeDebtsTotal === 0 ? t('fhs_no_debt') : fmt(activeDebtsTotal) + ' IQD'}
              </span>
            </div>
          </div>

          {/* AI Spending Patterns & 3 Actionable Tips Section */}
          <div className="bg-gradient-to-br from-teal-50/70 via-emerald-50/50 to-slate-50/70 dark:from-slate-900/90 dark:via-slate-850 dark:to-slate-900/90 rounded-2xl p-4 md:p-5 border border-teal-200/80 dark:border-teal-800/80 shadow-xs">
            {/* AI Control Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm md:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{t('fhs_ai_pattern_title')}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t('fhs_ai_badge')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunAiAnalysis}
                disabled={isAnalyzing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('fhs_analyzing')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{analysisData ? t('fhs_reanalyze_btn') : t('fhs_analyze_btn')}</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Loading Skeleton */}
            {isAnalyzing && (
              <div className="space-y-3 py-2 animate-pulse">
                <div className="h-16 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900/50 p-3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900/50" />
                  <div className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900/50" />
                  <div className="h-28 bg-white dark:bg-slate-800 rounded-xl border border-teal-100 dark:border-teal-900/50" />
                </div>
              </div>
            )}

            {/* If Analysis exists */}
            {!isAnalyzing && analysisData && (
              <div className="space-y-4">
                {/* 1. Spending Patterns Analysis Narrative */}
                <div className="bg-white/90 dark:bg-slate-800/90 rounded-xl p-3.5 md:p-4 border border-teal-100 dark:border-teal-900/60 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                      {analysisData.spendingPatternAnalysis}
                    </div>
                  </div>
                </div>

                {/* 2. Three Brief Actionable Money-Saving Tips */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h5 className="font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-emerald-600" />
                      <span>{t('fhs_ai_tips_title')}</span>
                    </h5>
                    <span className="text-[11px] text-slate-500">
                      {t('fhs_ai_personalized')} {currentMonth}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysisData.tips.map((tip, idx) => {
                      const isApplied = !!appliedTips[idx];
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col justify-between rounded-xl p-3.5 border transition-all ${
                            isApplied
                              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 opacity-90'
                              : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-teal-300 dark:hover:border-teal-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="w-6 h-6 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-black text-xs flex items-center justify-center font-mono">
                                {idx + 1}
                              </span>
                              {tip.category && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                                  {tip.category}
                                </span>
                              )}
                            </div>

                            <h6 className={`font-bold text-xs mb-1.5 ${isApplied ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              {tip.title}
                            </h6>

                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                              {tip.action}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-2">
                            {tip.impact ? (
                              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                                {tip.impact}
                              </span>
                            ) : (
                              <span />
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleTip(idx)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer shrink-0 ${
                                isApplied
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{isApplied ? t('fhs_tip_applied') : t('fhs_tip_apply')}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* If Not Yet Analyzed */}
            {!isAnalyzing && !analysisData && (
              <div className="text-center py-4 px-2">
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-3">
                  {t('fhs_cta_analyze_desc')}
                </p>
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('fhs_analyze_btn')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
