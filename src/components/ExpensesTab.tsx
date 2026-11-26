import React, { useState, useRef, useMemo } from 'react';
import {
  ScanLine,
  Sparkles,
  Camera,
  Plus,
  Save,
  X,
  Repeat,
  Users,
  Search,
  Pencil,
  Trash2,
  Undo2,
  AlertTriangle,
  Lock,
  Image as ImageIcon,
  CheckCircle2,
  TrendingDown,
  Calendar,
  Copy,
  Wallet,
  CreditCard,
  Coins,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Zap,
  Check,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Clock,
  Mic,
  Moon,
  Coffee,
  Car,
  Fuel,
  ShoppingBag,
  RotateCcw,
  HeartPulse,
  Scale,
  CalendarCheck,
  Flame,
  Award,
  Leaf,
  ThumbsUp,
  Utensils
} from 'lucide-react';
import { ExpenseTx, MonthDoc, NamesConfig, RecurringExpense, SavingsGoal } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { val, fmt, fa, calcMonthTotals } from '../utils/calculations';
import { haptics } from '../utils/haptics';
import { CategoryIcon } from './CategoryIcon';
import { AddExpenseModal } from './AddExpenseModal';
import { VoiceExpenseModal } from './VoiceExpenseModal';
import { ImpulsePauserModal } from './ImpulsePauserModal';
import { BillSplitModal } from './BillSplitModal';

interface ExpensesTabProps {
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  isLocked: boolean;
  langIndex: number;
  t: (key: string) => string;
  recurring: RecurringExpense[];
  goals?: SavingsGoal[];
  onDepositGoal?: (goalIdx: number, depositAmount: number) => void;
  onUpdateRates?: (fx: number, gp: number) => void;
  onAddExpense: (tx: ExpenseTx, repeatMonthly: boolean, dueDay?: number) => void;
  onEditExpense: (index: number, tx: ExpenseTx) => void;
  onDeleteExpense: (index: number) => void;
  onUndoDelete: () => void;
  hasUndo: boolean;
  onApplyRecurring: () => void;
  onDeleteRecurring: (idx: number) => void;
  workspaceId?: string;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  currentMonth,
  doc,
  names,
  isLocked,
  langIndex,
  t,
  recurring,
  goals = [],
  onDepositGoal,
  onUpdateRates,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onUndoDelete,
  hasUndo,
  onApplyRecurring,
  onDeleteRecurring,
  workspaceId
}) => {
  const [showRateModal, setShowRateModal] = useState(false);
  const [tempFx, setTempFx] = useState(names.fx || 1500);
  const [tempGp, setTempGp] = useState(names.gp || 65000);

  // 24-Hour Impulse Pauser Modal state
  const [isImpulseModalOpen, setIsImpulseModalOpen] = useState(false);

  // Payday Cycle settings state (Custom salary cycle, e.g. 25th of month)
  const [paydayDay, setPaydayDay] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('user_payday_day')) || names.payday || 25;
    } catch {
      return 25;
    }
  });
  const [showPaydayModal, setShowPaydayModal] = useState(false);
  const [tempPayday, setTempPayday] = useState(paydayDay);

  // Clean Modal Editing State (Replaces cluttered inline form)
  const [editingTx, setEditingTx] = useState<{ idx: number; tx: ExpenseTx } | null>(null);

  // AI states
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [filterPerson, setFilterPerson] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Photo modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Add Transaction Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultRepeat, setModalDefaultRepeat] = useState(false);
  const [modalDefaultCat, setModalDefaultCat] = useState(6);

  // Daily Quick Experience States (Voice, 1-Tap Toast, Evening Check, Bill Split)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isBillSplitOpen, setIsBillSplitOpen] = useState(false);
  const [showMoreInsights, setShowMoreInsights] = useState(false);
  const [quickToast, setQuickToast] = useState<{ id: number; message: string; itemIndex?: number } | null>(null);
  const [isEveningDismissed, setIsEveningDismissed] = useState<boolean>(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      return localStorage.getItem(`evening_check_${today}`) === 'true';
    } catch {
      return false;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const defaultRate = names.fx || 1500;
  const totals = calcMonthTotals(doc, defaultRate);
  const members = names.mem || [{ n: 'Person 1', e: 'user' }];
  const activeMemberIndices = members.map((_, i) => i).filter(i => !members[i]?.x);

  // Start editing via clean modal (Replaces cluttered inline form)
  const handleStartEdit = (idx: number) => {
    const tx = doc.tx[idx];
    if (!tx) return;
    setEditingTx({ idx, tx });
    setIsAddModalOpen(true);
  };

  // Duplicate / copy expense for fast re-entry via clean modal
  const handleDuplicateExpense = (tx: ExpenseTx) => {
    const today = new Date().toISOString().slice(0, 10);
    setEditingTx({
      idx: -1,
      tx: { ...tx, d: today.startsWith(currentMonth) ? today : `${currentMonth}-01` }
    });
    setIsAddModalOpen(true);
  };

  // Receipt Scanner via Server API -> opens clean AddExpenseModal pre-filled
  const handleReceiptScan = async (file: File) => {
    if (!file) return;
    setIsScanning(true);
    setScanMessage(t('scng'));

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/scan-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 })
          });

          if (!res.ok) throw new Error('API scan failed');
          const data = await res.json();

          if (data.total && +data.total > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const notes = [data.merchant, data.note].filter(Boolean).join(' - ');
            setEditingTx({
              idx: -1,
              tx: {
                c: data.category >= 0 && data.category < CATEGORIES.length ? data.category : 6,
                d: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : today,
                a: +data.total,
                cu: data.currency === 'USD' ? 'U' : 'D',
                r: defaultRate,
                w: 0,
                s: 0,
                ph: base64,
                n: notes
              }
            });
            setIsAddModalOpen(true);
            setScanMessage(t('scok'));
          } else {
            setScanMessage(t('scer'));
          }
        } catch (err) {
          console.error(err);
          setScanMessage(t('scer'));
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsScanning(false);
      setScanMessage(t('scer'));
    }
  };

  // Month Projection & Daily Allowance
  const now = new Date();
  const daysInMonth = new Date(+currentMonth.slice(0, 4), +currentMonth.slice(5), 0).getDate();
  const currentDay = now.toISOString().slice(0, 7) === currentMonth ? now.getDate() : 0;
  const projectedSpending = currentDay > 0 ? (totals.exp / currentDay) * daysInMonth : totals.exp;
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
  const dailyAllowance = Math.max(0, (totals.inc - totals.sv - totals.exp) / remainingDays);

  // Gamified No-Spend Days Count for current month
  const passedDaysCount = currentDay > 0 ? currentDay : daysInMonth;
  const noSpendDaysCount = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= passedDaysCount; d++) {
      const dStr = `${currentMonth}-${String(d).padStart(2, '0')}`;
      const hasSpend = (doc.tx || []).some(tx => tx.d === dStr);
      if (!hasSpend) count++;
    }
    return count;
  }, [currentMonth, passedDaysCount, doc.tx]);

  // Payday Cycle (Salaries in Kurdistan/Iraq cycle from e.g. 25th to 25th)
  const currentDom = now.getDate();
  let nextPaydayDate: Date;
  if (currentDom >= paydayDay) {
    nextPaydayDate = new Date(now.getFullYear(), now.getMonth() + 1, paydayDay);
  } else {
    nextPaydayDate = new Date(now.getFullYear(), now.getMonth(), paydayDay);
  }
  const msToNextPayday = Math.max(0, nextPaydayDate.getTime() - now.getTime());
  const daysUntilPayday = Math.max(1, Math.ceil(msToNextPayday / (1000 * 60 * 60 * 24)));
  const paydayDailyAllowance = Math.max(0, (totals.inc - totals.sv - totals.exp) / daysUntilPayday);

  // 50/30/20 Rule Metrics (Needs vs Wants vs Savings)
  const needsTotal = (doc.tx || []).reduce((sum, tx) => {
    return CATEGORIES[tx.c]?.rule === 'need' ? sum + val(tx, defaultRate) : sum;
  }, 0);

  const wantsTotal = (doc.tx || []).reduce((sum, tx) => {
    return CATEGORIES[tx.c]?.rule === 'want' ? sum + val(tx, defaultRate) : sum;
  }, 0);

  const savingsTotal = totals.sv || 0;
  const flowBasis = Math.max(totals.inc, needsTotal + wantsTotal + savingsTotal, 1);
  const needsPct = Math.round((needsTotal / flowBasis) * 100);
  const wantsPct = Math.round((wantsTotal / flowBasis) * 100);
  const savingsPct = Math.round((savingsTotal / flowBasis) * 100);

  // Filtered transactions
  const filteredList = (doc.tx || [])
    .map((tx, idx) => ({ tx, idx }))
    .filter(({ tx }) => {
      if (filterCat !== '' && tx.c !== +filterCat) return false;
      if (filterPerson !== '' && tx.w !== +filterPerson) return false;
      if (filterDateFrom && tx.d < filterDateFrom) return false;
      if (filterDateTo && tx.d > filterDateTo) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        // 1. Note / details description
        const notes = (tx.n || '').toLowerCase();
        // 2. Category name across all languages
        const cat = CATEGORIES[tx.c];
        const catNames = cat ? cat.names.join(' ').toLowerCase() : '';
        // 3. Amount checks (raw amount, formatted amount, and converted IQD value)
        const amtStr = String(tx.a).toLowerCase();
        const amtFmt = fmt(tx.a).toLowerCase().replace(/,/g, '');
        const amtFa = fa(tx.a).toLowerCase();
        const iqdVal = String(Math.round(val(tx, defaultRate)));
        const iqdFmt = fmt(val(tx, defaultRate)).toLowerCase().replace(/,/g, '');
        // 4. Currency tags
        const cuStr = tx.cu === 'U' ? 'usd $ dollar دۆلار' : 'iqd dinar دینار';
        // 5. Date
        const dateStr = (tx.d || '').toLowerCase();
        // 6. Person name
        const personName = (members[tx.w]?.n || '').toLowerCase();

        const matches =
          notes.includes(query) ||
          catNames.includes(query) ||
          amtStr.includes(query) ||
          amtFmt.includes(query) ||
          amtFa.includes(query) ||
          iqdVal.includes(query) ||
          iqdFmt.includes(query) ||
          cuStr.includes(query) ||
          dateStr.includes(query) ||
          personName.includes(query);

        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => (b.tx.d || '').localeCompare(a.tx.d || ''));

  // Bento Metrics
  const availableBalance = (totals.inc || 0) - (totals.exp || 0) - (totals.sv || 0);
  const spendingRatio = (totals.inc || 0) > 0 ? Math.min(100, Math.max(0, ((totals.exp || 0) / totals.inc) * 100)) : 0;
  const totalBudget = doc.bud.reduce((a, b) => a + b, 0);
  const budgetConsumedRatio = totalBudget > 0 ? Math.min(100, ((totals.exp || 0) / totalBudget) * 100) : 0;
  const safeCatsCount = CATEGORIES.filter((_, i) => (doc.bud[i] || 0) > 0 && (totals.sp[i] || 0) <= (doc.bud[i] || 0)).length;
  const totalBudgetedCats = CATEGORIES.filter((_, i) => (doc.bud[i] || 0) > 0).length;
  const primaryGoal = goals.length > 0 ? goals[0] : null;
  const goalProgress = primaryGoal && primaryGoal.t > 0 ? Math.min(100, (primaryGoal.s / primaryGoal.t) * 100) : 0;

  // Financial Peace Score (نمرەی ئارامی دارایی: 0 - 100)
  const budgetPts = totalBudget > 0 ? Math.max(0, Math.min(40, 40 * (1 - Math.max(0, budgetConsumedRatio - 80) / 40))) : 35;
  const savingsPts = (totals.inc || 0) > 0 ? Math.min(30, ((totals.sv || 0) / totals.inc) * 150) : 15;
  const wantsPts = flowBasis > 0 ? (wantsPct <= 30 ? 30 : Math.max(0, 30 - (wantsPct - 30) * 1.5)) : 25;
  const peaceScore = Math.min(100, Math.max(10, Math.round(budgetPts + savingsPts + wantsPts)));

  const peaceTier = peaceScore >= 80
    ? { label: 'نایاب', icon: <Leaf className="w-3 h-3 text-emerald-400" />, color: 'bg-emerald-400' }
    : peaceScore >= 60
    ? { label: 'باش', icon: <ThumbsUp className="w-3 h-3 text-teal-400" />, color: 'bg-teal-400' }
    : peaceScore >= 40
    ? { label: 'ئاگاداری', icon: <AlertTriangle className="w-3 h-3 text-amber-400" />, color: 'bg-amber-400' }
    : { label: 'پێویست بە ئارامی', icon: <HeartPulse className="w-3 h-3 text-rose-400" />, color: 'bg-rose-400' };

  // Daily Tracking Metrics (Today's safe allowance & actual spending)
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTxs = (doc.tx || []).filter(tx => tx.d === todayStr);
  const todaySpent = todayTxs.reduce((sum, tx) => sum + val(tx, defaultRate), 0);
  const todayRemaining = Math.max(0, dailyAllowance - todaySpent);
  const todaySpentPct = dailyAllowance > 0 ? (todaySpent / dailyAllowance) * 100 : 0;
  const isTodayOver = dailyAllowance > 0 && todaySpent > dailyAllowance;
  const currentHour = new Date().getHours();
  const isEveningTime = currentHour >= 17; // 5:00 PM onwards

  // 1-Tap Daily Favorites Quick Logger
  const handle1TapExpense = (item: { label: string; amount: number; cat: number }) => {
    if (doc.closed) return;
    haptics.success();
    const newTx: ExpenseTx = {
      c: item.cat,
      d: todayStr,
      a: item.amount,
      cu: 'D',
      r: defaultRate,
      w: 0,
      s: 0,
      n: item.label
    };
    onAddExpense(newTx, false);
    const toastId = Date.now();
    setQuickToast({
      id: toastId,
      message: `تۆمارکرا: ${item.label} (${fmt(item.amount)} د.ع)`,
      itemIndex: (doc.tx || []).length
    });
    setTimeout(() => {
      setQuickToast(prev => (prev?.id === toastId ? null : prev));
    }, 5000);
  };

  const handleDismissEveningCheck = () => {
    try {
      localStorage.setItem(`evening_check_${todayStr}`, 'true');
    } catch {}
    setIsEveningDismissed(true);
  };

  const handleSaveRates = () => {
    if (onUpdateRates) {
      onUpdateRates(tempFx, tempGp);
    }
    setShowRateModal(false);
  };

  const handleQuickDepositTopGoal = () => {
    if (onDepositGoal && goals.length > 0) {
      onDepositGoal(0, 50000);
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Closed month alert */}
      {doc.closed === 1 && (
        <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-red-700 dark:text-red-300 text-sm font-semibold">
          <Lock className="w-5 h-5 shrink-0" />
          <span>{t('lock')}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* BENTO GRID DASHBOARD (Modern Kurdish Fintech + Bento)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* TILE 1: Smart Fintech Digital Card (Hero Card - Col Span 2 on Desktop) */}
        <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white shadow-md bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/20 flex flex-col justify-between min-h-[220px]">
          {/* Subtle Atmospheric Glow */}
          <div className="absolute top-0 end-0 -mt-10 -me-10 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 start-0 -mb-10 -ms-10 w-52 h-52 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          {/* Card Top Row: Account & Status */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-300/90 tracking-wide">
                {workspaceId ? `شوێنی کار: ${workspaceId}` : 'پڕۆفایلی خێزانی داهاتوو'}
              </span>
              <span className="text-emerald-500/60">·</span>
              <span className="text-xs text-slate-400 font-mono">
                {currentMonth}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Financial Peace Score */}
              <div
                title="نمرەی ئارامی دارایی (Financial Peace Score)"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-emerald-200"
              >
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="inline-flex items-center gap-1">
                  <span>ئارامی: {peaceTier.label}</span>
                  {peaceTier.icon}
                  <span>(%{peaceScore})</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card Center: Available Balance */}
          <div className="relative z-10 my-2">
            <span className="text-xs font-medium text-slate-400 block mb-1">
              {t('proj').includes('خەرج') ? 'باڵانسی خەرجکردنی ماوە' : 'باڵانسی ماوەی مانگ (Available Balance)'}
            </span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white tabular-nums drop-shadow-sm">
                {isLocked ? '••••••••' : fmt(availableBalance)}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-300">
                {t('iqd')}
              </span>
            </div>
          </div>

          {/* Safe-to-Spend Today Micro-Bar (Mobile First) */}
          <div className="relative z-10 my-1.5 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isTodayOver ? 'text-amber-400' : 'text-emerald-400'}`} />
              <span className="text-slate-200 text-[11px] truncate">
                {isTodayOver ? 'تێپەڕاندن:' : 'سەلامەتی ئەمڕۆ:'}
              </span>
              <b className={`font-mono font-bold text-xs ${isTodayOver ? 'text-amber-300' : 'text-emerald-300'}`}>
                {fmt(isTodayOver ? Math.round((todaySpent - dailyAllowance) / 3) : todayRemaining)} {t('iqd')}
              </b>
            </div>
            <span className="text-[10px] font-medium text-emerald-200/90 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{noSpendDaysCount} ڕۆژی بێ-خەرجی</span>
            </span>
          </div>

          {/* Card Bottom: Sleek Hairline Progress Bar & 3 Inline Metrics */}
          <div className="relative z-10 mt-2 pt-2.5 border-t border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>ڕێژەی بەکارهێنانی داهات</span>
              <span className="font-mono font-bold text-emerald-300">{spendingRatio.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500"
                style={{ width: `${Math.min(100, spendingRatio)}%` }}
              />
            </div>

            {/* 3 Balanced Metrics Row */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">{t('inc')}</span>
                <b className="text-xs sm:text-sm font-mono font-bold text-emerald-300 truncate block">
                  {isLocked ? '••••••' : `+${fmt(totals.inc)}`}
                </b>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">{t('exp')}</span>
                <b className="text-xs sm:text-sm font-mono font-bold text-rose-300 truncate block">
                  {fmt(totals.exp)}
                </b>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">
                  {t('daily')} ({remainingDays} ڕۆژ)
                </span>
                <b className="text-xs sm:text-sm font-mono font-bold text-amber-200 truncate block">
                  {isLocked ? '••••' : `${fmt(dailyAllowance)}`}
                </b>
              </div>
            </div>
          </div>
        </div>

        {/* TILE 2: Live Market Ticker & Payday Tracker (Col Span 1 on Desktop) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  نرخەکانی بازاڕ
                </h3>
                <span className="text-[10px] text-slate-400">زێڕ و دۆلاری ڕۆژ</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setTempFx(names.fx || 1500);
                setTempGp(names.gp || 65000);
                setShowRateModal(true);
              }}
              className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline p-1 cursor-pointer"
            >
              دەستکاری
            </button>
          </div>

          <div className="space-y-2 my-auto">
            {/* Gold per Mithqal */}
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  زێڕی مسقاڵ (عیار ٢١)
                </span>
                <b className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                  {fmt(names.gp || 65000)} <span className="text-[10px] font-normal">{t('iqd')}</span>
                </b>
              </div>
              <Coins className="w-4 h-4 text-amber-500/50" />
            </div>

            {/* USD Exchange Rate */}
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                  ١٠٠ دۆلاری ئەمریکی (USD)
                </span>
                <b className="text-sm font-black font-mono text-slate-900 dark:text-white">
                  {fmt((names.fx || 1500) * 100)} <span className="text-[10px] font-normal text-slate-400">{t('iqd')}</span>
                </b>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">$100</span>
            </div>
          </div>

          {/* Payday Quick Badge */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setShowPaydayModal(true)}
              className="text-[11px] text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>مووچە: {paydayDay}ی مانگ ({daysUntilPayday} ڕۆژ)</span>
            </button>
            <span className="text-[10px] text-slate-400 font-mono">{names.fxd || currentMonth}</span>
          </div>
        </div>
      </div>


      {/* ======================================================== */}
      {/* 1-TAP FREQUENT DAILY FAVORITES CAROUSEL (Mobile First)   */}
      {/* ======================================================== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>خەرجییە باوەکان (1-Tap Favorites)</span>
          </span>
          <span className="text-[10px] text-slate-400">بە یەک پەنجەلێدان</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
          {[
            { label: "نان و سەمون", amount: 1000, cat: 6, Icon: Utensils, iconBg: "bg-amber-100/80 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400", color: "border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/30" },
            { label: "تەکسی", amount: 3000, cat: 8, Icon: Car, iconBg: "bg-yellow-100/80 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400", color: "border-yellow-200/60 dark:border-yellow-800/40 bg-yellow-50/50 dark:bg-yellow-950/30" },
            { label: "چای و کافێ", amount: 2000, cat: 10, Icon: Coffee, iconBg: "bg-orange-100/80 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400", color: "border-orange-200/60 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/30" },
            { label: "بەنزین", amount: 15000, cat: 8, Icon: Fuel, iconBg: "bg-blue-100/80 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400", color: "border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/30" },
            { label: "مارکێت", amount: 10000, cat: 6, Icon: ShoppingBag, iconBg: "bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400", color: "border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/30" }
          ].map((fav, i) => {
            const FavIcon = fav.Icon;
            return (
              <button
                key={i}
                type="button"
                disabled={Boolean(doc.closed)}
                onClick={() => handle1TapExpense(fav)}
                className={`shrink-0 flex items-center gap-2 py-2 px-3 rounded-2xl border ${fav.color} shadow-2xs hover:scale-102 active:scale-95 transition-all text-start cursor-pointer group`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${fav.iconBg}`}>
                  <FavIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block whitespace-nowrap">
                    {fav.label}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 block whitespace-nowrap">
                    +{fmt(fav.amount)} <span className="text-[9px] font-normal text-slate-400">د.ع</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* ======================================================== */}
      {/* ERGONOMIC ACTION DOCK (Thumb-Friendly Touch Hub)         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setModalDefaultRepeat(false);
            setModalDefaultCat(6);
            setEditingTx(null);
            setIsAddModalOpen(true);
          }}
          disabled={Boolean(doc.closed)}
          className="col-span-2 sm:col-span-2 py-3 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 font-bold text-xs cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ {t("newx")}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.medium();
            setIsVoiceModalOpen(true);
          }}
          disabled={Boolean(doc.closed)}
          className="col-span-1 py-3 px-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer active:scale-98"
          title="تۆماری دەنگی"
        >
          <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-bold">دەنگی</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            fileInputRef.current?.click();
          }}
          disabled={isScanning || Boolean(doc.closed)}
          className="col-span-1 py-3 px-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer active:scale-98"
          title="سکانی وەسڵ بە کامێرا"
        >
          <ScanLine className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span className="text-[11px] font-bold">{isScanning ? "..." : "سکان"}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.light();
            setIsImpulseModalOpen(true);
          }}
          className="col-span-4 sm:col-span-1 py-2 sm:py-3 px-2 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 rounded-2xl shadow-2xs transition-all flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer active:scale-98"
          title="سندووقی ٢٤ کاتژمێر بۆ ڕاگرتنی خەرجی کاتی"
        >
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-xs">سندووقی ٢٤ کاتژمێر</span>
        </button>
      </div>

      {/* Hidden File Input for Receipt Scanner */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files?.[0] && handleReceiptScan(e.target.files[0])}
      />

      {/* ======================================================== */}
      {/* QUICK RATES MODAL (Gold & USD FX)                        */}
      {/* ======================================================== */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>نوێکردنەوەی نرخەکانی بازاڕ</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  نرخی مسقاڵی زێڕ (عیار ٢١) بە دینار:
                </label>
                <input
                  type="number"
                  value={tempGp}
                  onChange={(e) => setTempGp(+e.target.value)}
                  className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  نرخی ئاڵوگۆڕی دۆلار (١ دۆلار = چەند دینار):
                </label>
                <input
                  type="number"
                  value={tempFx}
                  onChange={(e) => setTempFx(+e.target.value)}
                  className="w-full py-2 px-3 text-xs md:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  واتە ١٠٠ دۆلار = {fmt(tempFx * 100)} د.ع
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRateModal(false)}
                className="py-1.5 px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                پەشیمانبوونەوە
              </button>
              <button
                type="button"
                onClick={handleSaveRates}
                className="py-1.5 px-4 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                پاشەکەوتکردن
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Expense Log Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{t('log')}</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredList.length})
            </span>
          </h3>

          {hasUndo && (
            <button
              onClick={onUndoDelete}
              className="flex items-center gap-1.5 py-1 px-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg border border-amber-300 dark:border-amber-800 hover:bg-amber-500/20 transition"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>{t('udo')}</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 np">
          {/* Search Query */}
          <div className="col-span-2 relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('srch')}
              className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="w-full py-1.5 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
            >
              <option value="">{t('all')} ({t('cat')})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {getCategoryName(cat, langIndex)}
                </option>
              ))}
            </select>
          </div>

          {/* Person Filter */}
          {activeMemberIndices.length > 1 && (
            <div>
              <select
                value={filterPerson}
                onChange={(e) => setFilterPerson(e.target.value)}
                className="w-full py-1.5 px-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
              >
                <option value="">{t('all')} ({t('byp')})</option>
                {members.map((m, idx) =>
                  !m.x ? (
                    <option key={idx} value={idx}>
                      {m.n}
                    </option>
                  ) : null
                )}
              </select>
            </div>
          )}
        </div>

        {/* Mobile Apple Wallet Transaction Cards (md:hidden) */}
        <div className="md:hidden space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t('none')}
            </div>
          ) : (
            filteredList.map(({ tx, idx }) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/90 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <CategoryIcon
                      name={CATEGORIES[tx.c]?.icon}
                      className="w-5 h-5 text-teal-600 dark:text-teal-400"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white block truncate">
                      {getCategoryName(tx.c, langIndex)}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                      <span>{tx.d}</span>
                      <span>·</span>
                      <span className="truncate">{tx.n || members[tx.w]?.n || 'خەرجی'}</span>
                      {Boolean(tx.s) && (
                        <span className="px-1 py-0.2 rounded-xs bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                          خێزانی
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-end shrink-0">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                    {fa(tx.a)} {tx.cu === 'U' ? '$' : t('iqd')}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 mt-1 np">
                    {tx.ph && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhoto(tx.ph || null)}
                        className="p-1 rounded-md text-slate-400 hover:text-teal-600"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={Boolean(doc.closed)}
                      onClick={() => handleDuplicateExpense(tx)}
                      className="p-1 rounded-md text-slate-400 hover:text-emerald-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(doc.closed)}
                      onClick={() => handleStartEdit(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(doc.closed)}
                      onClick={() => onDeleteExpense(idx)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table of expenses (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-start">
                <th className="py-2.5 px-2 font-semibold text-start">{t('due')}</th>
                <th className="py-2.5 px-2 font-semibold text-start">{t('cat')}</th>
                <th className="py-2.5 px-2 font-semibold text-start">{t('amt')}</th>
                <th className="py-2.5 px-2 font-semibold text-start">{t('byp')}</th>
                <th className="py-2.5 px-2 font-semibold text-start">{t('desc')}</th>
                <th className="py-2.5 px-2 font-semibold text-end np"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t('none')}
                  </td>
                </tr>
              ) : (
                filteredList.map(({ tx, idx }) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {tx.d}
                    </td>
                    <td className="py-2.5 px-2 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon
                          name={CATEGORIES[tx.c]?.icon}
                          className="w-4 h-4 text-teal-600 dark:text-teal-400"
                        />
                        <span>{getCategoryName(tx.c, langIndex)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-bold whitespace-nowrap">
                      <span>{fa(tx.a)}</span>
                      <span className="text-xs text-slate-400 ms-1">
                        {tx.cu === 'U' ? '$' : t('iqd')}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <span>{members[tx.w]?.n || '—'}</span>
                        {Boolean(tx.s) && (
                          <span
                            title={t('shr')}
                            className="p-0.5 rounded-sm bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300"
                          >
                            <Users className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-slate-500 max-w-[180px] truncate">
                      {tx.n || '—'}
                    </td>
                    <td className="py-2.5 px-2 text-end whitespace-nowrap np">
                      <div className="flex items-center justify-end gap-1">
                        {tx.ph && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto(tx.ph || null)}
                            className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={Boolean(doc.closed)}
                          onClick={() => handleDuplicateExpense(tx)}
                          title="دووبارەکردنەوە / Duplicate"
                          className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(doc.closed)}
                          onClick={() => handleStartEdit(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(doc.closed)}
                          onClick={() => onDeleteExpense(idx)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* ======================================================== */}
      {/* END-OF-DAY EVENING CHECK CARD                            */}
      {/* ======================================================== */}
      {(isEveningTime || todayTxs.length > 0) && !isEveningDismissed && (
        <div className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
                <Moon className="w-5 h-5 fill-indigo-300/30 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">پێداچوونەوەی ئێواران</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 font-semibold">
                    کۆتایی ڕۆژ
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 mt-1">
                  ئەمڕۆ <b className="text-white font-bold">{todayTxs.length}</b> خەرجیت بە کۆی{' '}
                  <b className="text-emerald-300 font-bold">{fmt(todaySpent)} د.ع</b> تۆمار کردووە.
                  ئایا هیچ خەرجییەکی ترت بیرچووە تۆماری بکەیت؟
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setModalDefaultRepeat(false);
                  setIsAddModalOpen(true);
                }}
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ تۆمارکردنی خەرجی</span>
              </button>
              <button
                type="button"
                onClick={handleDismissEveningCheck}
                className="py-2 px-3.5 bg-white/10 hover:bg-white/20 text-indigo-100 rounded-xl text-xs font-bold transition border border-white/15 cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>هەمووی تۆمارە</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Secondary Analytics & Coaching Toggle */}
      <button
        type="button"
        onClick={() => setShowMoreInsights(!showMoreInsights)}
        className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center justify-between transition shadow-2xs cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          <span>شیکاری و وردەکاری زیاتر (یاسای ٥٠/٣٠/٢٠، تەندروستی بودجە، پسوولە مانگانەکان)</span>
        </span>
        {showMoreInsights ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showMoreInsights && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* ======================================================== */}
      {/* DAILY SAFE-TO-SPEND WIDGET & COMPASSIONATE COACH         */}
      {/* ======================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isTodayOver 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>خەرجی سەلامەتی ئەمڕۆ</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {todayStr}
                </span>
              </h3>
              <span className="text-[10px] text-slate-400">
                بەپێی سووڕی مووچە ({daysUntilPayday} ڕۆژ ماوە) و ئاستی سەلامەتی مانگانە
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{noSpendDaysCount} ڕۆژی بێ-خەرجی</span>
            </span>

            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
              isTodayOver
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isTodayOver ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              {isTodayOver ? (
                <span className="inline-flex items-center gap-1">
                  <span>ڕاهێنەر: خەمت نەبێت</span>
                  <Leaf className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span>ئاستی سەلامەتی: نایابە</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Compassionate Financial Coaching Banner */}
        <div className={`p-3 rounded-2xl mb-3 border text-xs leading-relaxed ${
          isTodayOver
            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
            : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-200'
        }`}>
          {isTodayOver ? (
            <div className="flex items-start gap-2">
              <Leaf className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p>
                <b>ئارام بە، هیچ کێشەیەک نییە!</b> تێپەڕاندنی ڕۆژانە بەشێکە لە ژیانی سروشتی خێزان. ئەگەر لە ٣ ڕۆژی داهاتوودا ڕۆژانە بڕی{' '}
                <b className="font-mono font-bold">{fmt(Math.round((todaySpent - dailyAllowance) / 3))} {t('iqd')}</b> کەمتر خەرج بکەیت،
                هاوسەنگی داراییەکەت بە تەواوی دەگەڕێتەوە شوێنی خۆی بەبێ ئەوەی هەست بە هیچ گوشارێک بکەیت.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p>
                <b>دەستخۆش! هەنگاوەکانت زۆر زیرەکانەن.</b> هێشتا بڕی{' '}
                <b className="font-mono font-bold">{fmt(todayRemaining)} {t('iqd')}</b> لە باڵانسی ئارامی ئەمڕۆت ماوە.
                پاراستنی ئەم هاوسەنگییە دڵنیایی دەدات کە تا هاتنی مووچەی نوێ لە ئاسوودەیی داراییدا بیت.
              </p>
            </div>
          )}
        </div>

        {/* Integrated Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3.5">
          <div className="py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between sm:flex-col sm:items-start">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">ڕێگەپێدراوی ڕۆژ</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {fmt(dailyAllowance)}
              </span>
              <span className="text-[10px] text-slate-400">{t('iqd')}</span>
            </div>
          </div>

          <div className="py-2.5 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between sm:flex-col sm:items-start">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">خەرجکراوی ئەمڕۆ</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                {todayTxs.length}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-base sm:text-lg font-black font-mono tabular-nums ${
                isTodayOver ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
              }`}>
                {fmt(todaySpent)}
              </span>
              <span className="text-[10px] text-slate-400">{t('iqd')}</span>
            </div>
          </div>

          <div className={`py-2.5 px-3 rounded-2xl border flex items-center justify-between sm:flex-col sm:items-start ${
            isTodayOver 
              ? 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-300' 
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}>
            <span className="text-[11px] opacity-80">
              {isTodayOver ? 'کەمکردنەوە بۆ ٣ ڕۆژ' : 'ماوەی خەرجی ئەمڕۆ'}
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-black font-mono tabular-nums">
                {fmt(isTodayOver ? Math.round((todaySpent - dailyAllowance) / 3) : todayRemaining)}
              </span>
              <span className="text-[10px] opacity-75">{t('iqd')}</span>
            </div>
          </div>
        </div>

        {/* Today's spending progress bar */}
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>ڕێژەی بەکارهێنانی سەلامەتی ئەمڕۆ</span>
            <span className="font-bold">{todaySpentPct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isTodayOver
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, todaySpentPct)}%` }}
            />
          </div>
        </div>

        {/* Savings Streak & Badges + Quick Bill Split */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>زنجیرەی ئارامی: {Math.max(1, currentDay - (isTodayOver ? 1 : 0))} ڕۆژ</span>
            </span>
            {peaceScore >= 75 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-[11px] font-bold">
                <Award className="w-3.5 h-3.5 text-emerald-500" />
                <span>مەدالیای هاوسەنگی</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsBillSplitOpen(true)}
            disabled={Boolean(doc.closed)}
            className="py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>دابەشکردنی خەرجی هاوبەش</span>
          </button>
        </div>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
        {/* TILE 3: Budget Adherence Bento Tile */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  تەندروستی بودجە
                </h3>
                <span className="text-[10px] text-slate-400">پابەندبوون بە خەرجی</span>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                budgetConsumedRatio > 100
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : budgetConsumedRatio > 80
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              {budgetConsumedRatio > 100
                ? 'لە سنوور دەرچوو'
                : budgetConsumedRatio > 80
                ? 'نزیک سنوور'
                : 'سەلامەت'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {budgetConsumedRatio.toFixed(0)}%
              </span>
              <span className="text-xs text-slate-400">
                {fmt(totals.exp)} / {fmt(totalBudget)} {t('iqd')}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  budgetConsumedRatio > 100
                    ? 'bg-rose-500'
                    : budgetConsumedRatio > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, budgetConsumedRatio)}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>پۆلە پارێزراوەکان:</span>
            <b className="font-bold text-emerald-600 dark:text-emerald-400">
              {safeCatsCount} لە {totalBudgetedCats} پۆل
            </b>
          </div>
        </div>

        {/* TILE 4: Savings & Instant 1-Tap Deposit Bento Tile */}
        <div className="col-span-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {primaryGoal ? primaryGoal.n : 'سندوقی پاشەکەوتی خێزان'}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {primaryGoal ? 'ئامانجی سەرەکی ئەم قۆناغە' : 'کۆی پاشەکەوتکراو'}
                </span>
              </div>
            </div>

            {/* Quick 1-Tap Deposit Button (+ 50,000 IQD) */}
            <button
              type="button"
              onClick={handleQuickDepositTopGoal}
              disabled={goals.length === 0}
              className="py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>+ 50,000 د.ع (دانانی خێرا)</span>
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                کۆکراوەتەوە: <b className="text-slate-900 dark:text-white font-bold">{fmt(primaryGoal?.s || totals.sv)} {t('iqd')}</b>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ئامانج: <b className="text-slate-900 dark:text-white font-bold">{fmt(primaryGoal?.t || 5000000)} {t('iqd')}</b>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
          </div>

          <div className="mt-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
            <span>پێشکەوتنی ئامانج: <b className="text-teal-600 dark:text-teal-400">{goalProgress.toFixed(1)}%</b></span>
            <span>بڕی پاشەکەوتی ئەم مانگە: <b className="text-slate-800 dark:text-slate-200 font-bold">{fmt(totals.sv)} د.ع</b></span>
          </div>
        </div>

        {/* TILE 5: Golden Economic Rule 50/30/20 (یاسای زێڕینی ئابووری) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>یاسای زێڕینی ئابووری (٥٠ / ٣٠ / ٢٠)</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                    ستانداردی دەروونی و دارایی
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400">
                  دابەشکردنی هاوسەنگی بودجە بەپێی زانستی دارای و دڵنیایی ژیان
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400">کۆی ئابووری:</span>
              <b className="font-mono font-bold text-slate-900 dark:text-white">{fmt(totals.exp + totals.sv)} {t('iqd')}</b>
            </div>
          </div>

          {/* Tri-segment progress bar */}
          <div className="space-y-1.5 my-2">
            <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
              <div
                title={`پێداویستییەکان: ${needsPct.toFixed(0)}%`}
                className="h-full bg-teal-500 transition-all duration-500"
                style={{ width: `${Math.min(100, needsPct)}%` }}
              />
              <div
                title={`ئارەزووەکان: ${wantsPct.toFixed(0)}%`}
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100 - needsPct, wantsPct)}%` }}
              />
              <div
                title={`پاشەکەوت: ${savingsPct.toFixed(0)}%`}
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100 - needsPct - wantsPct, savingsPct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-500" /> پێداویستی (٥٠٪)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> ئارەزوو (٣٠٪)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> پاشەکەوت (٢٠٪)</span>
            </div>
          </div>

          {/* 3 Pillars Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
            {/* Needs (50%) */}
            <div className="p-3 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-teal-900 dark:text-teal-200">
                  ١. پێداویستی (٥٠٪)
                </span>
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-400 font-mono">
                  {needsPct.toFixed(0)}%
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {fmt(needsTotal)} <span className="text-[10px] font-normal text-slate-500">{t('iqd')}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                خواردن، دەرمان، کرێ، کارەبا و ئاو
              </span>
            </div>

            {/* Wants (30%) */}
            <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  ٢. ئارەزوو (٣٠٪)
                </span>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 font-mono">
                  {wantsPct.toFixed(0)}%
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {fmt(wantsTotal)} <span className="text-[10px] font-normal text-slate-500">{t('iqd')}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                کافێ، خواردنگە، گەشت و دیاری
              </span>
            </div>

            {/* Savings (20%) */}
            <div className="p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-blue-900 dark:text-blue-200">
                  ٣. پاشەکەوت (٢٠٪)
                </span>
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 font-mono">
                  {savingsPct.toFixed(0)}%
                </span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {fmt(savingsTotal)} <span className="text-[10px] font-normal text-slate-500">{t('iqd')}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                سندووقی ئامانج، زێڕ و حاڵەتی لەناکاو
              </span>
            </div>
          </div>
        </div>
      </div>
          </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Repeat className="w-4 h-4 text-teal-600" />
            <span>{t('rec')}</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalDefaultRepeat(true);
                setModalDefaultCat(4); // default to internet
                setIsAddModalOpen(true);
              }}
              disabled={Boolean(doc.closed)}
              className="py-1 px-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('add')}</span>
            </button>
            {recurring.length > 0 && (
              <button
                onClick={onApplyRecurring}
                disabled={Boolean(doc.closed) || doc.rec === 1}
                className="py-1 px-3 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-700 dark:text-teal-300 disabled:opacity-40 text-xs font-bold rounded-lg border border-teal-200 dark:border-teal-800 transition"
              >
                {doc.rec === 1 ? t('ok2') : t('recap')}
              </button>
            )}
          </div>
        </div>

        {recurring.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            <p className="mb-2">{t('none')}</p>
            <button
              onClick={() => {
                setModalDefaultRepeat(true);
                setModalDefaultCat(1); // default to electricity
                setIsAddModalOpen(true);
              }}
              className="py-1.5 px-3 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold rounded-xl border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('recbill_title').split(' / ')[0]} ({getCategoryName(1, langIndex).split(' ')[0]}, {getCategoryName(4, langIndex)}...)</span>
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recurring.map((rec, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon name={CATEGORIES[rec.c]?.icon} className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{getCategoryName(rec.c, langIndex)}</span>
                  {rec.n && <span className="text-slate-400 truncate max-w-[120px]">({rec.n})</span>}
                  {rec.dd && <span className="text-teal-600 dark:text-teal-400 font-medium">({t('recbill_day').split(' (')[0]}: {rec.dd})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <b className="font-bold">{fa(rec.a)} {rec.cu === 'U' ? '$' : t('iqd')}</b>
                  <button
                    onClick={() => onDeleteRecurring(i)}
                    className="text-red-500 hover:text-red-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </div>
      )}


      {/* Receipt Photo Preview Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
        >
          <div className="relative max-w-2xl max-h-[90vh] bg-transparent">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 end-0 p-2 text-white hover:text-slate-300"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewPhoto}
              alt="Receipt"
              className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Add / Edit Transaction & Recurring Bill Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTx(null);
        }}
        currentMonth={currentMonth}
        doc={doc}
        names={names}
        langIndex={langIndex}
        t={t}
        onAddExpense={onAddExpense}
        onEditExpense={onEditExpense}
        editingIndex={editingTx?.idx ?? null}
        initialTx={editingTx?.tx ?? null}
        defaultRepeat={modalDefaultRepeat}
        defaultCategory={modalDefaultCat}
        onOpenVoice={() => setIsVoiceModalOpen(true)}
      />

      {/* 24-Hour Impulse Buying Pauser (سندووقی ئارامبوونەوە) */}
      <ImpulsePauserModal
        isOpen={isImpulseModalOpen}
        onClose={() => setIsImpulseModalOpen(false)}
        onAddExpense={(tx) => onAddExpense(tx, false)}
        defaultRate={defaultRate}
        langIndex={langIndex}
        currentMonth={currentMonth}
      />

      {/* Smart Bill Split Modal (دابەشکردنی خەرجی هاوبەش) */}
      <BillSplitModal
        isOpen={isBillSplitOpen}
        onClose={() => setIsBillSplitOpen(false)}
        onAddExpense={onAddExpense}
        defaultRate={defaultRate}
        fxRates={names.fxRates}
        currentMonth={currentMonth}
      />

      {/* Payday Cycle Settings Modal (سووڕی مانگی مووچە) */}
      {showPaydayModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150 pb-[max(24px,env(safe-area-inset-bottom))]">
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">سووڕی مانگی مووچە</h3>
                  <span className="text-[10px] text-slate-400">کاتی وەرگرتنی مووچە یان داهاتی سەرەکی</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaydayModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              دیاریکردنی ڕۆژی مووچە یارمەتیت دەدات خەرجی ڕۆژانەت بە شێوەیەکی دروست بەپێی ڕۆژە ماوەکانی تا مووچەی نوێ دابەش بکرێت نەک مانگی ڕۆژمێری.
            </p>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                ڕۆژی وەرگرتنی مووچە (١ - ٣١):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={paydayDay}
                  onChange={(e) => {
                    const val = Math.min(31, Math.max(1, parseInt(e.target.value) || 1));
                    setPaydayDay(val);
                  }}
                  className="w-24 py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center font-bold text-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                />
                <span className="text-xs text-slate-500">ی هەموو مانگێک</span>
              </div>

              {/* Quick Preset Buttons for Kurdistan Salaried Days */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400">ڕۆژە باوەکان:</span>
                {[1, 15, 20, 25, 28].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPaydayDay(d)}
                    className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer font-mono ${
                      paydayDay === d
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('user_payday_day', String(paydayDay));
                  setShowPaydayModal(false);
                }}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                تۆمارکردن و ڕێکخستنی خەرجی ڕۆژانە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kurdish Voice AI Modal */}
      <VoiceExpenseModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddExpense={(tx, rep) => onAddExpense(tx, rep)}
        langIndex={langIndex}
        currentMonth={currentMonth}
        defaultRate={defaultRate}
      />

      {/* Floating 1-Tap Toast Notification with Undo */}
      {quickToast && (
        <div className="fixed bottom-24 sm:bottom-6 inset-x-0 mx-auto w-max max-w-[92vw] z-50 flex items-center gap-2.5 px-4 py-2.5 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 rounded-2xl shadow-2xl backdrop-blur-md border border-white/10 dark:border-slate-800 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="truncate">{quickToast.message}</span>
          <button
            type="button"
            onClick={() => {
              const lastIdx = (doc.tx || []).length - 1;
              if (lastIdx >= 0) {
                onDeleteExpense(lastIdx);
              }
              setQuickToast(null);
            }}
            className="ms-1 px-2.5 py-1 bg-white/20 dark:bg-black/10 hover:bg-white/30 rounded-lg text-emerald-300 dark:text-emerald-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>پاشگەزبوونەوە</span>
          </button>
          <button
            type="button"
            onClick={() => setQuickToast(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-black cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
