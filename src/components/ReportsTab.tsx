import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart as PieIcon,
  Users,
  Scale,
  CalendarRange,
  Columns2,
  BarChart2,
  Sparkles,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  List,
  Calendar,
  CalendarDays,
  Layers,
  Search,
  Activity,
  ArrowUpRight,
  RotateCcw,
  Check,
  ArrowRightLeft
} from 'lucide-react';
import { MonthDoc, NamesConfig, ExpenseTx, DebtItem, RecurringExpense, SavingsGoal } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import {
  val,
  fmt,
  calcMonthTotals,
  calc503020,
  calcSettleUp,
  sum,
  shiftMonth
} from '../utils/calculations';
import { exportExcelWorkbook, loadMonthDoc } from '../utils/storage';
import { CategoryIcon } from './CategoryIcon';
import { IncomeSpendingBarChart } from './IncomeSpendingBarChart';
import { MonthlySummaryCard } from './MonthlySummaryCard';
import { SavingsAdvisorCard } from './SavingsAdvisorCard';
import { FinancialPDFReportModal } from './FinancialPDFReportModal';
import { FinancialForecastCard } from './FinancialForecastCard';
import { FinancialHealthScoreCard } from './FinancialHealthScoreCard';
import { AIBudgetSuggestionModal } from './AIBudgetSuggestionModal';
import { AnnualTrendsView } from './AnnualTrendsView';
import { ReportsChartsSection } from './ReportsChartsSection';
import { SpendingHeatmapCalendar } from './SpendingHeatmapCalendar';

interface ReportsTabProps {
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  isLocked: boolean;
  langIndex: number;
  monthNames: string[];
  t: (key: string) => string;
  onUpdateBudget: (catIndex: number, amount: number) => void;
  onSuggestBudget: () => void;
  onApplyBudgetAllocation?: (newBudgets: number[]) => void;
  workspaceId?: string;
  recurring?: RecurringExpense[];
  debts?: DebtItem[];
  goals?: SavingsGoal[];
}

type ReportMode = 'monthly' | 'weekly' | 'category' | 'charts' | 'trends' | 'health' | 'calendar';
type WeekFilter = 'all' | 'w1' | 'w2' | 'w3' | 'w4' | 'w5';

export const ReportsTab: React.FC<ReportsTabProps> = ({
  currentMonth,
  doc,
  names,
  isLocked,
  langIndex,
  monthNames,
  t,
  onUpdateBudget,
  onApplyBudgetAllocation,
  workspaceId,
  recurring = [],
  debts = [],
  goals = []
}) => {
  // Navigation / Dimension Mode
  const [reportMode, setReportMode] = useState<ReportMode>('monthly');
  const [selectedWeek, setSelectedWeek] = useState<WeekFilter>('all');
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<number>(6); // default: groceries
  const [catSearchTerm, setCatSearchTerm] = useState<string>('');

  const [showPDFModal, setShowPDFModal] = useState<boolean>(false);
  const defaultRate = names.fx || 1500;
  const currentTotals = calcMonthTotals(doc, defaultRate);
  const ruleBreakdown = calc503020(currentTotals);
  const members = names.mem || [{ n: 'Person 1', e: 'user' }];
  const activeMemberIndices = members.map((_, i) => i).filter(i => !members[i]?.x);

  // Previous month data for comparisons
  const prevMonthStr = shiftMonth(currentMonth, -1);
  const [prevDoc, setPrevDoc] = useState<MonthDoc | null>(null);

  // Month A / Month B comparison
  const [cmpMonthA, setCmpMonthA] = useState<string>(currentMonth);
  const [cmpMonthB, setCmpMonthB] = useState<string>(prevMonthStr);
  const [docA, setDocA] = useState<MonthDoc>(doc);
  const [docB, setDocB] = useState<MonthDoc | null>(null);

  // Year docs for 12 months chart
  const currentYear = currentMonth.slice(0, 4);
  const [yearDocs, setYearDocs] = useState<MonthDoc[]>([]);

  // Category trend selector in monthly tab
  const [trendCatIndex, setTrendCatIndex] = useState<number>(6);

  // Automated AI Budget Suggestion State
  const [showAiBudgetModal, setShowAiBudgetModal] = useState<boolean>(false);
  const [isAnalyzingAiBudget, setIsAnalyzingAiBudget] = useState<boolean>(false);
  const [aiBudgetExplanation, setAiBudgetExplanation] = useState<string>('');
  const [aiBudgetHighlights, setAiBudgetHighlights] = useState<string[]>([]);
  const [aiProposedBudgets, setAiProposedBudgets] = useState<number[]>([]);
  const [aiThreeMonthAverages, setAiThreeMonthAverages] = useState<number[]>([]);
  const [aiMonthsAnalyzed, setAiMonthsAnalyzed] = useState<string[]>([]);

  // Load comparison and year docs
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const pDoc = await loadMonthDoc(prevMonthStr, workspaceId);
      if (isMounted) setPrevDoc(pDoc);

      const yDocs: MonthDoc[] = [];
      for (let m = 1; m <= 12; m++) {
        const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
        yDocs.push(await loadMonthDoc(mStr, workspaceId));
      }
      if (isMounted) setYearDocs(yDocs);

      const loadedA = await loadMonthDoc(cmpMonthA, workspaceId);
      const loadedB = await loadMonthDoc(cmpMonthB, workspaceId);
      if (isMounted) {
        setDocA(loadedA);
        setDocB(loadedB);
      }
    })();

    return () => { isMounted = false; };
  }, [currentMonth, currentYear, cmpMonthA, cmpMonthB, workspaceId]);

  const prevTotals = prevDoc ? calcMonthTotals(prevDoc, defaultRate) : null;
  const totalsA = calcMonthTotals(docA, defaultRate);
  const totalsB = docB ? calcMonthTotals(docB, defaultRate) : totalsA;

  // Budget Rollover State & Calculation (Surplus from previous month)
  const [rolloverSurplusOnly, setRolloverSurplusOnly] = useState<boolean>(true);
  const [rolloverApplied, setRolloverApplied] = useState<boolean>(false);

  const rolloverData = useMemo(() => {
    if (!prevDoc || !prevTotals) {
      return {
        hasData: false,
        totalSurplus: 0,
        totalDeficit: 0,
        categories: CATEGORIES.map(() => ({ prevBudget: 0, prevSpent: 0, diff: 0, rolloverAmount: 0 }))
      };
    }
    let totalSurplus = 0;
    let totalDeficit = 0;
    const categories = CATEGORIES.map((_, i) => {
      const prevBudget = prevDoc.bud?.[i] || 0;
      const prevSpent = prevTotals.sp?.[i] || 0;
      const diff = prevBudget - prevSpent;
      if (diff > 0) totalSurplus += diff;
      if (diff < 0) totalDeficit += Math.abs(diff);
      return {
        prevBudget,
        prevSpent,
        diff,
        rolloverAmount: rolloverSurplusOnly ? Math.max(0, diff) : diff
      };
    });
    return {
      hasData: true,
      totalSurplus,
      totalDeficit,
      categories
    };
  }, [prevDoc, prevTotals, rolloverSurplusOnly]);

  const handleApplyAllRollovers = () => {
    if (!rolloverData.hasData || Boolean(doc.closed)) return;
    const newBudgets = CATEGORIES.map((_, i) => {
      const currentBud = doc.bud?.[i] || 0;
      const add = rolloverData.categories[i]?.rolloverAmount || 0;
      return Math.max(0, currentBud + add);
    });
    if (onApplyBudgetAllocation) {
      onApplyBudgetAllocation(newBudgets);
    } else {
      newBudgets.forEach((amount, i) => onUpdateBudget(i, amount));
    }
    setRolloverApplied(true);
    setTimeout(() => setRolloverApplied(false), 3000);
  };

  const handleApplySingleCategoryRollover = (catIndex: number) => {
    if (Boolean(doc.closed)) return;
    const currentBud = doc.bud?.[catIndex] || 0;
    const add = rolloverData.categories[catIndex]?.rolloverAmount || 0;
    onUpdateBudget(catIndex, Math.max(0, currentBud + add));
  };

  // Calculation of Daily Allowance for Heatmap Calendar
  const heatmapDailyAllowance = useMemo(() => {
    const y = parseInt(currentMonth.slice(0, 4), 10);
    const m = parseInt(currentMonth.slice(5, 7), 10);
    const totalDays = new Date(y, m, 0).getDate();
    const today = new Date();
    const cDay = (today.getFullYear() === y && today.getMonth() + 1 === m) ? today.getDate() : totalDays;
    const remDays = Math.max(1, totalDays - cDay + 1);
    const fromIncome = Math.max(0, Math.round((currentTotals.inc - currentTotals.sv - currentTotals.exp) / remDays));
    const totalBud = sum(doc.bud);
    if (fromIncome > 0) return fromIncome;
    if (totalBud > 0) return Math.round(totalBud / totalDays);
    return 25000;
  }, [currentMonth, currentTotals, doc.bud]);

  // Settle up shared expenses
  const settleUp = calcSettleUp(doc.tx || [], activeMemberIndices, defaultRate);

  // Spending by person
  const personSpends = members.map((_, pIdx) => {
    const total = sum(
      (doc.tx || [])
        .filter(x => x.w === pIdx)
        .map(x => val(x, defaultRate))
    );
    return { name: members[pIdx]?.n || `P${pIdx + 1}`, total, isSoftDeleted: members[pIdx]?.x };
  });
  const maxPersonSpend = Math.max(1, ...personSpends.map(p => p.total));

  // Category ranking this month
  const categoryRanking = currentTotals.sp
    .map((amount, idx) => ({ idx, amount }))
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // SVG Donut calculation
  let cumulativeOffset = 0;
  const donutSlices = categoryRanking.map((item, i) => {
    const pct = currentTotals.exp > 0 ? (item.amount / currentTotals.exp) * 100 : 0;
    const slice = {
      ...item,
      pct,
      offset: cumulativeOffset,
      color: `hsl(${(i * 47) % 360}, 65%, 48%)`
    };
    cumulativeOffset += pct;
    return slice;
  });

  // 12 Months comparison stats
  const yearMonthlyTotals = yearDocs.map(d => calcMonthTotals(d, defaultRate));
  const maxYearSpend = Math.max(1, ...yearMonthlyTotals.map(t => Math.max(isLocked ? 0 : t.inc, t.exp)));
  const maxTrendCatSpend = Math.max(1, ...yearMonthlyTotals.map(t => t.sp[trendCatIndex] || 0));

  // ============================================================
  // WEEKLY REPORT CALCULATIONS
  // ============================================================
  const transactions: ExpenseTx[] = doc.tx || [];

  const getWeekForDay = (day: number): 'w1' | 'w2' | 'w3' | 'w4' | 'w5' => {
    if (day <= 7) return 'w1';
    if (day <= 14) return 'w2';
    if (day <= 21) return 'w3';
    if (day <= 28) return 'w4';
    return 'w5';
  };

  const weeklyBreakdown = useMemo(() => {
    const weeks: Record<'w1' | 'w2' | 'w3' | 'w4' | 'w5', { total: number; count: number; txs: ExpenseTx[] }> = {
      w1: { total: 0, count: 0, txs: [] },
      w2: { total: 0, count: 0, txs: [] },
      w3: { total: 0, count: 0, txs: [] },
      w4: { total: 0, count: 0, txs: [] },
      w5: { total: 0, count: 0, txs: [] }
    };

    transactions.forEach(tx => {
      const day = parseInt(tx.d.split('-')[2] || '1', 10);
      const wKey = getWeekForDay(day);
      const amount = val(tx, defaultRate);
      weeks[wKey].total += amount;
      weeks[wKey].count += 1;
      weeks[wKey].txs.push(tx);
    });

    return weeks;
  }, [transactions, defaultRate]);

  // Filtered transactions by selected week
  const filteredWeeklyTxs = useMemo(() => {
    if (selectedWeek === 'all') return transactions;
    return weeklyBreakdown[selectedWeek]?.txs || [];
  }, [transactions, weeklyBreakdown, selectedWeek]);

  const selectedWeekTotal = useMemo(() => {
    if (selectedWeek === 'all') return currentTotals.exp;
    return weeklyBreakdown[selectedWeek]?.total || 0;
  }, [selectedWeek, weeklyBreakdown, currentTotals.exp]);

  // Day of week spending distribution
  const dayNamesLocal = useMemo(() => {
    const list: string[][] = [
      // 0: ckb
      ['یەکشەممە', 'دووشەممە', 'سێشەممە', 'چوارشەممە', 'پێنجشەممە', 'هەینی', 'شەممە'],
      // 1: ar
      ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
      // 2: en
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      // 3: kmr
      ['Yekşem', 'Duşem', 'Sêşem', 'Çarşem', 'Pêncşem', 'În', 'Şemî'],
      // 4: fa
      ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'],
      // 5: tr
      ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
      // 6: de
      ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
      // 7: fr
      ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      // 8: es
      ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      // 9: ru
      ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'],
      // 10: it
      ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'],
      // 11: sv
      ['Söndag', 'Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lördag'],
      // 12: nl
      ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
      // 13: zh
      ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    ];
    return list[langIndex] || list[0];
  }, [langIndex]);

  const dayOfWeekSpend = useMemo(() => {
    const days = Array(7).fill(0);
    filteredWeeklyTxs.forEach(tx => {
      const dateObj = new Date(tx.d);
      if (!isNaN(dateObj.getTime())) {
        const dIdx = dateObj.getDay(); // 0 = Sunday .. 6 = Saturday
        days[dIdx] += val(tx, defaultRate);
      }
    });
    const max = Math.max(1, ...days);
    const busiestIdx = days.indexOf(Math.max(...days));
    return { days, max, busiestIdx };
  }, [filteredWeeklyTxs, defaultRate]);

  const maxWeekSpend = Math.max(
    1,
    weeklyBreakdown.w1.total,
    weeklyBreakdown.w2.total,
    weeklyBreakdown.w3.total,
    weeklyBreakdown.w4.total,
    weeklyBreakdown.w5.total
  );

  // ============================================================
  // CATEGORY / EXPENSE REPORT CALCULATIONS
  // ============================================================
  const categoryTxs = useMemo(() => {
    return transactions.filter(tx => tx.c === selectedCategoryIdx);
  }, [transactions, selectedCategoryIdx]);

  const categoryTotalSpent = useMemo(() => {
    return currentTotals.sp[selectedCategoryIdx] || 0;
  }, [currentTotals.sp, selectedCategoryIdx]);

  const categoryBudget = doc.bud[selectedCategoryIdx] || 0;
  const categoryRemaining = categoryBudget - categoryTotalSpent;
  const categoryPctOfExpenses = currentTotals.exp > 0 ? (categoryTotalSpent / currentTotals.exp) * 100 : 0;
  const categoryAvgTx = categoryTxs.length > 0 ? Math.round(categoryTotalSpent / categoryTxs.length) : 0;
  const maxYearCatTrend = Math.max(1, ...yearMonthlyTotals.map(t => t.sp[selectedCategoryIdx] || 0));

  // Automated AI Budget Suggestion based on last 3 months
  const handleOpenAiBudgetSuggestion = async () => {
    if (doc.closed) return;
    setIsAnalyzingAiBudget(true);
    setShowAiBudgetModal(true);

    const m1Str = shiftMonth(currentMonth, -1);
    const m2Str = shiftMonth(currentMonth, -2);
    const m3Str = shiftMonth(currentMonth, -3);
    const monthsList = [m1Str, m2Str, m3Str];
    setAiMonthsAnalyzed(monthsList);

    try {
      const [d1, d2, d3] = await Promise.all([
        loadMonthDoc(m1Str, workspaceId),
        loadMonthDoc(m2Str, workspaceId),
        loadMonthDoc(m3Str, workspaceId)
      ]);

      const t1 = calcMonthTotals(d1, defaultRate);
      const t2 = calcMonthTotals(d2, defaultRate);
      const t3 = calcMonthTotals(d3, defaultRate);

      const averages = Array(CATEGORIES.length).fill(0).map((_, i) => {
        const s1 = t1.sp[i] || 0;
        const s2 = t2.sp[i] || 0;
        const s3 = t3.sp[i] || 0;
        return Math.round((s1 + s2 + s3) / 3);
      });
      setAiThreeMonthAverages(averages);

      const payload = {
        currentMonth,
        monthlyIncomeIQD: isLocked ? undefined : currentTotals.inc,
        months: [
          { month: m1Str, totalExpenses: t1.exp, spendingPerCategory: t1.sp },
          { month: m2Str, totalExpenses: t2.exp, spendingPerCategory: t2.sp },
          { month: m3Str, totalExpenses: t3.exp, spendingPerCategory: t3.sp }
        ],
        categoryNames: CATEGORIES.map(c => getCategoryName(c, langIndex)),
        currentBudgets: doc.bud || []
      };

      const langNames = ['Kurdish Sorani', 'Arabic', 'English', 'Kurdish Badini', 'Persian', 'Turkish'];
      const res = await fetch('/api/ai-suggest-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: payload,
          language: langNames[langIndex] || 'Kurdish Sorani'
        })
      });

      if (!res.ok) throw new Error('AI budget suggestion failed');
      const data = await res.json();

      let proposedArr = Array(CATEGORIES.length).fill(0);
      if (Array.isArray(data.proposedBudgets)) {
        data.proposedBudgets.forEach((item: any) => {
          if (item && typeof item.index === 'number' && item.index >= 0 && item.index < CATEGORIES.length) {
            proposedArr[item.index] = Math.max(0, +item.amount || 0);
          }
        });
      } else {
        proposedArr = averages.map(avg => avg > 0 ? Math.ceil((avg * 1.05) / 5000) * 5000 : 0);
      }

      setAiProposedBudgets(proposedArr);
      setAiBudgetExplanation(data.explanation || t('ai_bud_modal_desc'));
      setAiBudgetHighlights(Array.isArray(data.highlights) && data.highlights.length > 0 ? data.highlights : [
        t('ai_bud_saving_action'),
        t('ai_bud_review_action'),
        t('ai_bud_logic_strategy')
      ]);
    } catch (err) {
      console.warn('AI budget suggestion fallback:', err);
      const [d1, d2, d3] = await Promise.all([
        loadMonthDoc(m1Str, workspaceId),
        loadMonthDoc(m2Str, workspaceId),
        loadMonthDoc(m3Str, workspaceId)
      ]);
      const t1 = calcMonthTotals(d1, defaultRate);
      const t2 = calcMonthTotals(d2, defaultRate);
      const t3 = calcMonthTotals(d3, defaultRate);
      const averages = Array(CATEGORIES.length).fill(0).map((_, i) => {
        return Math.round(((t1.sp[i] || 0) + (t2.sp[i] || 0) + (t3.sp[i] || 0)) / 3);
      });
      setAiThreeMonthAverages(averages);

      const fallbackProposed = averages.map((avg, i) => {
        if (avg > 0) return Math.ceil((avg * 1.05) / 5000) * 5000;
        return doc.bud[i] || 0;
      });
      setAiProposedBudgets(fallbackProposed);
      setAiBudgetExplanation(
        `${t('ai_bud_modal_desc')} (${monthsList.join(', ')})`
      );
      setAiBudgetHighlights([
        t('ai_bud_saving_action'),
        t('ai_bud_review_action'),
        t('ai_bud_logic_strategy')
      ]);
    } finally {
      setIsAnalyzingAiBudget(false);
    }
  };

  const handleApplyProposedBudget = (finalBudgets: number[]) => {
    if (onApplyBudgetAllocation) {
      onApplyBudgetAllocation(finalBudgets);
    } else {
      finalBudgets.forEach((amt, idx) => {
        onUpdateBudget(idx, amt);
      });
    }
  };

  return (
    <div className="space-y-4 pb-14 max-w-4xl mx-auto">
      {/* 1. TOP DIMENSION & REPORT MODE SELECTOR */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-xs border border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1">
        <button
          type="button"
          onClick={() => setReportMode('monthly')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'monthly'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_monthly')}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('weekly')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'weekly'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <CalendarDays className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_weekly')}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('category')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'category'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_category')}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('charts')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'charts'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_charts') || 'چارت و بودجە'}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('trends')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'trends'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_trends') || 'ڕەوتی ساڵانە'}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('health')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            reportMode === 'health'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Activity className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('rep_mode_health')}</span>
        </button>

        <button
          type="button"
          onClick={() => setReportMode('calendar')}
          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer col-span-2 sm:col-span-1 ${
            reportMode === 'calendar'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="truncate">ڕۆژژمێری خەرجی</span>
        </button>
      </div>

      {/* QUICK ACTIONS & EXPORT HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white dark:bg-slate-800 rounded-2xl p-3 px-4 shadow-xs border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {currentMonth}
          </span>
          <span className="text-[11px] text-slate-400">
            ({transactions.length} {t('rep_tx_count')})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPDFModal(true)}
            className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('pdf_print_save')}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              exportExcelWorkbook({
                currentMonth,
                isYearly: false,
                isIncomeLocked: isLocked,
                workspaceId,
                langIndex,
                monthNames,
                members,
                defaultRate
              })
            }
            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          VIEW 1: MONTHLY REPORT OVERVIEW
          ============================================================ */}
      {reportMode === 'monthly' && (
        <div className="space-y-4">
          {/* Overview 5 KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block mb-0.5">
                {t('inc')}
              </span>
              <b className="text-base md:text-xl font-black text-emerald-800 dark:text-emerald-100 block truncate">
                {isLocked ? '••••••' : fmt(currentTotals.inc)}
              </b>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 block mb-0.5">
                {t('exp')}
              </span>
              <b className="text-base md:text-xl font-black text-rose-800 dark:text-rose-100 block truncate">
                {fmt(currentTotals.exp)}
              </b>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 block mb-0.5">
                {t('ns')}
              </span>
              <b className="text-base md:text-xl font-black text-blue-800 dark:text-blue-100 block truncate">
                {fmt(currentTotals.sv)}
              </b>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3 text-center">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block mb-0.5">
                {t('rem')}
              </span>
              <b className={`text-base md:text-xl font-black block truncate ${!isLocked && currentTotals.rem < 0 ? 'text-red-600' : 'text-amber-800 dark:text-amber-100'}`}>
                {isLocked ? '••••••' : fmt(currentTotals.rem)}
              </b>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 block mb-0.5">
                {t('rate')}
              </span>
              <b className="text-base md:text-xl font-black text-purple-800 dark:text-purple-100 block truncate">
                {isLocked ? '••••' : `${Math.round(currentTotals.savingsRate * 100)}%`}
              </b>
            </div>
          </div>

          {/* Month vs Previous Month Comparison */}
          {prevTotals && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-xs border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {currentTotals.exp > prevTotals.exp ? (
                  <TrendingUp className="w-4 h-4 text-rose-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                )}
                <span>
                  {t('vsprev')}: <b>{fmt(currentTotals.exp)}</b> vs <b>{fmt(prevTotals.exp)}</b> IQD
                </span>
              </div>
              <span className={`font-bold px-2 py-0.5 rounded-full ${currentTotals.exp > prevTotals.exp ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                {currentTotals.exp > prevTotals.exp ? '+' : ''}
                {prevTotals.exp > 0 ? Math.round(((currentTotals.exp - prevTotals.exp) / prevTotals.exp) * 100) : 0}%
              </span>
            </div>
          )}

          {/* Income vs Spending & Top Categories Recharts Bar Chart */}
          <IncomeSpendingBarChart
            income={currentTotals.inc}
            expenses={currentTotals.exp}
            savings={currentTotals.sv}
            remaining={currentTotals.rem}
            isLocked={isLocked}
            categorySpending={currentTotals.sp}
            categoryBudgets={doc.bud}
            langIndex={langIndex}
            t={t}
          />

          {/* Spending by Category with Animated Donut */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-teal-600" />
              <span>{t('bycat')}</span>
            </h3>

            {currentTotals.exp === 0 ? (
              <p className="text-center text-xs text-slate-400 py-8">{t('none')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                <div className="flex justify-center">
                  <div className="relative w-44 h-44">
                    <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90 transform">
                      {donutSlices.map((slice, i) => (
                        <circle
                          key={i}
                          cx="21"
                          cy="21"
                          r="15.9155"
                          fill="none"
                          stroke={slice.color}
                          strokeWidth="6"
                          strokeDasharray={`${slice.pct} ${100 - slice.pct}`}
                          strokeDashoffset={-slice.offset}
                          className="transition-all duration-700 ease-out"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-slate-400 font-medium">{t('exp')}</span>
                      <b className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 truncate px-2">
                        {fmt(currentTotals.exp)}
                      </b>
                      <span className="text-[10px] text-slate-400">{t('iqd')}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pe-2">
                  {donutSlices.map((slice, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: slice.color }} />
                        <span className="font-medium truncate">{getCategoryName(slice.idx, langIndex)}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-slate-400">{Math.round(slice.pct)}%</span>
                        <b className="font-bold text-slate-800 dark:text-slate-200">{fmt(slice.amount)}</b>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 50/30/20 Rule Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-teal-600" />
              <span>{t('rule')} (50/30/20)</span>
            </h3>

            {isLocked ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-center text-xs text-slate-400">
                {t('locked')}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{t('ned')}</span>
                    <span>{ruleBreakdown.needsPct}% / 50% ({fmt(ruleBreakdown.needs)} IQD)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ruleBreakdown.needsPct > 50 ? 'bg-amber-500' : 'bg-teal-500'}`}
                      style={{ width: `${Math.min(100, ruleBreakdown.needsPct)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{t('wnt')}</span>
                    <span>{ruleBreakdown.wantsPct}% / 30% ({fmt(ruleBreakdown.wants)} IQD)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ruleBreakdown.wantsPct > 30 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(100, ruleBreakdown.wantsPct)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600 dark:text-slate-300">{t('ns')} (20%)</span>
                    <span>{ruleBreakdown.savingsPct}% / 20% ({fmt(ruleBreakdown.savings)} IQD)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, ruleBreakdown.savingsPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Member Spending & Settle-Up */}
          {personSpends.filter(p => !p.isSoftDeleted).length > 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
              <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                <span>{t('byp')}</span>
              </h3>
              <div className="space-y-3">
                {personSpends.map((p, i) => (
                  !p.isSoftDeleted ? (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>{p.name}</span>
                        <span>{fmt(p.total)} IQD</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-500"
                          style={{ width: `${(p.total / maxPersonSpend) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : null
                ))}
              </div>

              {settleUp.totalShared > 0 && activeMemberIndices.length > 1 && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-xl space-y-2 mt-2">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                    {t('stl')} ({t('shr')}: {fmt(settleUp.totalShared)} IQD)
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {settleUp.transfers.map((tr, i) => (
                      <div key={i} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-white dark:bg-slate-900 font-medium">
                        <span className="font-bold text-rose-600">{members[tr.fromIndex]?.n}</span>
                        <span className="text-slate-400">{t('owe')}</span>
                        <span className="font-bold text-emerald-600">{members[tr.toIndex]?.n}</span>
                        <b className="ms-auto text-teal-700 dark:text-teal-300">{fmt(tr.amount)} IQD</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Category Budget Table with Automated AI Suggestion & Rollover */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100">
                  {t('bud')}
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  ({fmt(sum(doc.bud))} IQD)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAiBudgetSuggestion}
                  disabled={Boolean(doc.closed) || isAnalyzingAiBudget}
                  className="flex items-center gap-2 py-1.5 px-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('ai_bud_btn')}</span>
                </button>
              </div>
            </div>

            {/* Budget Rollover from Previous Month Banner */}
            {rolloverData.hasData && (
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 dark:border-emerald-500/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          گواستنەوەی باقیماندەی بودجە (Budget Rollover)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
                          مانگی {prevMonthStr}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        کۆی باقیماندەی خەرجنەکراوی مانگی پێشوو:{' '}
                        <b className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          +{fmt(rolloverData.totalSurplus)} د.ع
                        </b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rolloverSurplusOnly}
                        onChange={(e) => setRolloverSurplusOnly(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                      <span>تەنها پاشەکەوت و زیادەکان</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleApplyAllRollovers}
                      disabled={Boolean(doc.closed) || rolloverData.totalSurplus <= 0}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        rolloverApplied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50'
                      }`}
                    >
                      {rolloverApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>جێبەجێ کرا!</span>
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>جێبەجێکردنی زیادکراوەکان</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-start text-xs border-collapse">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-start">
                    <th className="py-2 px-2 text-start">{t('cat')}</th>
                    <th className="py-2 px-2 text-start">{t('bud')}</th>
                    <th className="py-2 px-2 text-start">ماوەی پێشوو (Rollover)</th>
                    <th className="py-2 px-2 text-start">{t('exp')}</th>
                    <th className="py-2 px-2 text-start">{t('left')}</th>
                    <th className="py-2 px-2 text-start w-20">{t('used')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {CATEGORIES.map((cat, i) => {
                    const b = doc.bud[i] || 0;
                    const spent = currentTotals.sp[i] || 0;
                    const left = b - spent;
                    const pct = b > 0 ? (spent / b) * 100 : 0;
                    const catRollover = rolloverData.categories[i];
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-750/40">
                        <td className="py-2 px-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            <CategoryIcon name={cat.icon} className="w-4 h-4 text-teal-600" />
                            <span>{getCategoryName(cat, langIndex)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            disabled={Boolean(doc.closed)}
                            value={b || ''}
                            onChange={(e) => onUpdateBudget(i, +e.target.value)}
                            placeholder="0"
                            className="w-24 py-1 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          {rolloverData.hasData && catRollover && catRollover.diff !== 0 ? (
                            <div className="flex items-center gap-1">
                              <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                catRollover.diff > 0
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}>
                                {catRollover.diff > 0 ? '+' : ''}{fmt(catRollover.diff)}
                              </span>
                              {catRollover.diff > 0 && !Boolean(doc.closed) && (
                                <button
                                  type="button"
                                  onClick={() => handleApplySingleCategoryRollover(i)}
                                  title="زیادکردنی ئەم باقیماندەیە بۆ بودجەی ئەم مانگە"
                                  className="p-1 rounded bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 dark:bg-slate-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 transition cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-semibold">{fmt(spent)}</td>
                        <td className={`py-2 px-2 font-bold ${left < 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {fmt(left)}
                        </td>
                        <td className="py-2 px-2">
                          <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Yearly Comparison Chart (12 Months) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-teal-600" />
              <span>{t('yr')} ({currentYear})</span>
            </h3>

            <div className="flex items-end gap-1.5 h-32 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
              {yearMonthlyTotals.map((mTotals, idx) => {
                const incH = isLocked ? 0 : (mTotals.inc / maxYearSpend) * 100;
                const expH = (mTotals.exp / maxYearSpend) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    <div className="w-full flex items-end justify-center gap-0.5 h-full">
                      {!isLocked && (
                        <div
                          className="w-1.5 sm:w-2 bg-emerald-500 rounded-t-xs transition-all duration-500"
                          style={{ height: `${incH}%` }}
                          title={`${monthNames[idx]}: Inc ${fmt(mTotals.inc)}`}
                        />
                      )}
                      <div
                        className="w-1.5 sm:w-2 bg-rose-500 rounded-t-xs transition-all duration-500"
                        style={{ height: `${expH}%` }}
                        title={`${monthNames[idx]}: Exp ${fmt(mTotals.exp)}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-2">
              {!isLocked && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span>{t('inc')}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                <span>{t('exp')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 2: WEEKLY REPORT (هەفتانە) - ALL NEW & DETAILED!
          ============================================================ */}
      {reportMode === 'weekly' && (
        <div className="space-y-4">
          {/* Week Filter Pills */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-xs border border-slate-200 dark:border-slate-700 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all' as WeekFilter, label: t('rep_all_weeks') },
              { id: 'w1' as WeekFilter, label: t('rep_week_1') },
              { id: 'w2' as WeekFilter, label: t('rep_week_2') },
              { id: 'w3' as WeekFilter, label: t('rep_week_3') },
              { id: 'w4' as WeekFilter, label: t('rep_week_4') },
              { id: 'w5' as WeekFilter, label: t('rep_week_5') }
            ].map(pill => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedWeek(pill.id)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedWeek === pill.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Weekly Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">
                {selectedWeek === 'all' ? t('rep_total_exp') : t('rep_week_spent')}
              </span>
              <b className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                {fmt(selectedWeekTotal)} IQD
              </b>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">
                {t('rep_weekly_avg')}
              </span>
              <b className="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400">
                {fmt(Math.round(selectedWeekTotal / (selectedWeek === 'all' ? 30 : 7)))} IQD
              </b>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">
                {t('rep_tx_count')}
              </span>
              <b className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100">
                {filteredWeeklyTxs.length}
              </b>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 block mb-0.5">
                {t('rep_busiest_day')}
              </span>
              <b className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 truncate block">
                {dayNamesLocal[dayOfWeekSpend.busiestIdx] || '-'}
              </b>
            </div>
          </div>

          {/* Week-by-Week Visual Comparison Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center justify-between">
              <span>{t('rep_5_week_comp')}</span>
              <span className="text-[11px] font-mono text-slate-400 font-normal">
                {t('rep_total_exp')}: {fmt(currentTotals.exp)} IQD
              </span>
            </h3>

            <div className="grid grid-cols-5 gap-2 items-end h-32 pt-4 pb-2 border-b border-slate-200 dark:border-slate-700">
              {(['w1', 'w2', 'w3', 'w4', 'w5'] as const).map((wKey, idx) => {
                const wData = weeklyBreakdown[wKey];
                const heightPct = maxWeekSpend > 0 ? (wData.total / maxWeekSpend) * 100 : 0;
                const isCurrentFilter = selectedWeek === wKey;
                return (
                  <button
                    key={wKey}
                    type="button"
                    onClick={() => setSelectedWeek(selectedWeek === wKey ? 'all' : wKey)}
                    className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isCurrentFilter
                          ? 'bg-teal-500 shadow-md ring-2 ring-teal-400'
                          : 'bg-teal-600/80 hover:bg-teal-600'
                      }`}
                      style={{ height: `${Math.max(8, heightPct)}%` }}
                    />
                    <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                      W{idx + 1}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {fmt(wData.total)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day of Week Spending Velocity */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-teal-600" />
              <span>{t('rep_days_of_week')}</span>
            </h3>

            <div className="space-y-2">
              {dayNamesLocal.map((dayName, dIdx) => {
                const spent = dayOfWeekSpend.days[dIdx] || 0;
                const pct = dayOfWeekSpend.max > 0 ? (spent / dayOfWeekSpend.max) * 100 : 0;
                const isBusiest = dIdx === dayOfWeekSpend.busiestIdx && spent > 0;
                return (
                  <div key={dIdx}>
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <span className="flex items-center gap-1.5">
                        <span>{dayName}</span>
                        {isBusiest && (
                          <span className="text-[9px] bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                            {t('rep_peak_spending')}
                          </span>
                        )}
                      </span>
                      <b className="font-mono text-slate-700 dark:text-slate-200">{fmt(spent)} IQD</b>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isBusiest ? 'bg-amber-500' : 'bg-teal-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Transactions List */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <List className="w-4 h-4 text-teal-600" />
              <span>
                {t('rep_tx_log_for')} {selectedWeek === 'all' ? t('nm') : selectedWeek.toUpperCase()} ({filteredWeeklyTxs.length})
              </span>
            </h3>

            {filteredWeeklyTxs.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">{t('rep_no_tx_period')}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-80 overflow-y-auto">
                {filteredWeeklyTxs.map((tx, idx) => {
                  const catDef = CATEGORIES[tx.c];
                  const total = val(tx, defaultRate);
                  return (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 shrink-0">
                          <CategoryIcon name={catDef?.icon || 'tag'} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <b className="block truncate text-slate-800 dark:text-slate-100">
                            {getCategoryName(catDef, langIndex)}
                          </b>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>{tx.d}</span>
                            {tx.n && <span className="truncate">({tx.n})</span>}
                            <span>• {members[tx.w]?.n}</span>
                          </div>
                        </div>
                      </div>
                      <b className="font-mono text-sm text-slate-900 dark:text-slate-100 shrink-0">
                        {fmt(total)} IQD
                      </b>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: BY EXPENSE & CATEGORY REPORT (بەپێی پۆل و خەرجی) - ALL NEW & DEEP-DIVE!
          ============================================================ */}
      {reportMode === 'category' && (
        <div className="space-y-4">
          {/* Category Filter Search & Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={catSearchTerm}
                onChange={(e) => setCatSearchTerm(e.target.value)}
                placeholder={t('rep_search_cat_ph')}
                className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>

            {/* Category Pills Grid */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {CATEGORIES.filter(cat => {
                if (!catSearchTerm.trim()) return true;
                const name = getCategoryName(cat, langIndex).toLowerCase();
                return name.includes(catSearchTerm.toLowerCase());
              }).map(cat => {
                const isSelected = selectedCategoryIdx === cat.id;
                const spent = currentTotals.sp[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryIdx(cat.id)}
                    className={`py-1.5 px-3 rounded-xl border text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : spent > 0
                          ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-teal-500'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                    <span>{getCategoryName(cat, langIndex)}</span>
                    {spent > 0 && <span className="font-mono text-[10px] opacity-80">({fmt(spent)})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deep-Dive Card for the Selected Category */}
          {(() => {
            const activeCat = CATEGORIES[selectedCategoryIdx];
            return (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                      <CategoryIcon name={activeCat?.icon || 'tag'} className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
                        {getCategoryName(activeCat, langIndex)}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        {activeCat?.rule === 'need' ? t('rep_rule_need_label') : t('rep_rule_want_label')}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                    {Math.round(categoryPctOfExpenses)}% {t('pdf_of_total_expense')}
                  </span>
                </div>

                {/* 4 Stats KPIs for Selected Category */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{t('pdf_cat_col_spent')}</span>
                    <b className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {fmt(categoryTotalSpent)} IQD
                    </b>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{t('pdf_cat_col_budget')}</span>
                    <b className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300">
                      {fmt(categoryBudget)} IQD
                    </b>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{t('rem')}</span>
                    <b className={`text-sm sm:text-base font-black ${categoryRemaining < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {fmt(categoryRemaining)} IQD
                    </b>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">{t('rep_avg_tx')}</span>
                    <b className="text-sm sm:text-base font-black text-teal-600">
                      {fmt(categoryAvgTx)} IQD
                    </b>
                  </div>
                </div>

                {/* 12-Month Category Trend */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {t('rep_12m_trend_for')} {getCategoryName(activeCat, langIndex)} ({currentYear})
                  </h4>
                  <div className="flex items-end gap-1.5 h-24 pt-2 pb-1 border-b border-slate-200 dark:border-slate-700">
                    {yearMonthlyTotals.map((mTotals, idx) => {
                      const sp = mTotals.sp[selectedCategoryIdx] || 0;
                      const h = maxYearCatTrend > 0 ? (sp / maxYearCatTrend) * 100 : 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end">
                          <div
                            className="w-full bg-teal-500 rounded-t-xs transition-all duration-300"
                            style={{ height: `${Math.max(4, h)}%` }}
                            title={`${monthNames[idx]}: ${fmt(sp)} IQD`}
                          />
                          <span className="text-[9px] text-slate-400 mt-1">{idx + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Itemized Transactions for Selected Category */}
                <div>
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                    <span>{t('rep_cat_tx_records')}</span>
                    <span className="text-[10px] text-slate-400">{categoryTxs.length} {t('rep_records_count')}</span>
                  </h4>

                  {categoryTxs.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6">{t('none')}</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs max-h-64 overflow-y-auto">
                      {categoryTxs.map((tx, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {tx.n || getCategoryName(activeCat, langIndex)}
                            </span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{tx.d}</span>
                              <span>• {members[tx.w]?.n}</span>
                            </div>
                          </div>
                          <b className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                            {fmt(val(tx, defaultRate))} IQD
                          </b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================
          VIEW 4: FINANCIAL HEALTH & FORECAST
          ============================================================ */}
      {reportMode === 'health' && (
        <div className="space-y-4">
          {/* Financial Health Summary Card with AI Spending Patterns Analysis & 3 Saving Tips */}
          <FinancialHealthScoreCard
            currentMonth={currentMonth}
            doc={doc}
            prevDoc={prevDoc}
            names={names}
            debts={debts}
            goals={goals}
            t={t}
            isLocked={isLocked}
            langIndex={langIndex}
          />

          {/* 6-Month Financial Cash Flow Forecast */}
          <FinancialForecastCard
            currentMonth={currentMonth}
            doc={doc}
            names={names}
            recurring={recurring}
            debts={debts}
            langIndex={langIndex}
            monthNames={monthNames}
            t={t}
            isLocked={isLocked}
          />

          {/* Smart Savings & Cut-Spending Advisor */}
          <SavingsAdvisorCard
            currentMonth={currentMonth}
            doc={doc}
            names={names}
            langIndex={langIndex}
            t={t}
            onUpdateBudget={onUpdateBudget}
          />
        </div>
      )}

      {/* 5. CHARTS & BUDGET ADHERENCE REPORT VIEW */}
      {reportMode === 'charts' && (
        <ReportsChartsSection
          currentYear={currentYear}
          currentMonth={currentMonth}
          doc={doc}
          yearDocs={yearDocs}
          defaultRate={defaultRate}
          isLocked={isLocked}
          langIndex={langIndex}
          monthNames={monthNames}
          t={t}
        />
      )}

      {/* 6. ANNUAL TRENDS REPORT VIEW */}
      {reportMode === 'trends' && (
        <AnnualTrendsView
          currentYear={currentYear}
          currentMonth={currentMonth}
          yearDocs={yearDocs}
          defaultRate={defaultRate}
          isLocked={isLocked}
          monthNames={monthNames}
          langIndex={langIndex}
          t={t}
        />
      )}

      {/* 7. SPENDING HEATMAP CALENDAR & NO-SPEND DAYS */}
      {reportMode === 'calendar' && (
        <SpendingHeatmapCalendar
          currentMonth={currentMonth}
          doc={doc}
          names={names}
          defaultRate={defaultRate}
          dailyAllowance={heatmapDailyAllowance}
          langIndex={langIndex}
          t={t}
        />
      )}

      {/* Official Monthly Financial Summary Card for WhatsApp & PNG Export */}
      <MonthlySummaryCard
        currentMonth={currentMonth}
        doc={doc}
        names={names}
        langIndex={langIndex}
        t={t}
      />

      {/* Financial PDF Report Statement Modal */}
      <FinancialPDFReportModal
        isOpen={showPDFModal}
        onClose={() => setShowPDFModal(false)}
        currentMonth={currentMonth}
        doc={doc}
        names={names}
        langIndex={langIndex}
        monthNames={monthNames}
        t={t}
        workspaceName={names.mn}
        isLocked={isLocked}
      />

      {/* Automated AI Budget Suggestion Modal */}
      <AIBudgetSuggestionModal
        isOpen={showAiBudgetModal}
        onClose={() => setShowAiBudgetModal(false)}
        currentMonth={currentMonth}
        monthsAnalyzed={aiMonthsAnalyzed}
        currentBudgets={doc.bud || []}
        threeMonthAverages={aiThreeMonthAverages}
        initialProposedBudgets={aiProposedBudgets}
        explanation={aiBudgetExplanation}
        highlights={aiBudgetHighlights}
        isLoading={isAnalyzingAiBudget}
        income={currentTotals.inc}
        isIncomeLocked={isLocked}
        langIndex={langIndex}
        t={t}
        onApply={handleApplyProposedBudget}
        onReanalyze={handleOpenAiBudgetSuggestion}
      />
    </div>
  );
};
