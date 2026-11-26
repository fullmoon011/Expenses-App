import React, { useState, useRef, useEffect } from 'react';
import {
  PiggyBank,
  Plus,
  Trophy,
  Banknote,
  X,
  Check,
  Target,
  TrendingUp,
  Sparkles,
  CalendarDays,
  Pencil,
  CheckCircle2,
  CalendarClock,
  ArrowUpDown,
  Flame,
  AlertTriangle,
  ListFilter,
  ChevronDown,
  Calendar,
  Clock,
  Zap
} from 'lucide-react';
import { SavingsGoal, SavingsDeposit } from '../types';
import { fmt } from '../utils/calculations';

export type SavingsSortOption =
  | 'nearest_deadline'
  | 'highest_progress'
  | 'most_urgent'
  | 'default';

interface SavingsTabProps {
  currentMonth: string;
  goals: SavingsGoal[];
  deposits: SavingsDeposit[];
  onAddGoal: (name: string, target: number, targetMonth?: string, monthlyTarget?: number) => void;
  onUpdateGoal?: (goalIndex: number, updates: Partial<SavingsGoal>) => void;
  onDeposit: (goalIndex: number, amount: number) => void;
  onUndoDeposit: (depositIndex: number) => void;
  onDeleteGoal: (goalIndex: number) => void;
  t: (key: string) => string;
}

export const SavingsTab: React.FC<SavingsTabProps> = ({
  currentMonth,
  goals,
  deposits,
  onAddGoal,
  onUpdateGoal,
  onDeposit,
  onUndoDeposit,
  onDeleteGoal,
  t
}) => {
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalMonthlyTarget, setGoalMonthlyTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [customDeposit, setCustomDeposit] = useState<Record<number, string>>({});

  // Predefined Quick Deposit state (e.g. 50,000 IQD)
  const [predefinedQuickDeposit, setPredefinedQuickDeposit] = useState<number>(50000);
  const [lastDepositedGoal, setLastDepositedGoal] = useState<number | null>(null);
  const [lastDepositedAmount, setLastDepositedAmount] = useState<number>(0);

  const handleTriggerQuickDeposit = (idx: number, amount: number) => {
    if (amount <= 0) return;
    onDeposit(idx, amount);
    setLastDepositedGoal(idx);
    setLastDepositedAmount(amount);
    setTimeout(() => {
      setLastDepositedGoal((curr) => (curr === idx ? null : curr));
    }, 2500);
  };

  // Sorting state
  const [sortBy, setSortBy] = useState<SavingsSortOption>('default');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Editing existing goal's monthly target & deadline
  const [editingTargetIdx, setEditingTargetIdx] = useState<number | null>(null);
  const [editMonthlyTargetVal, setEditMonthlyTargetVal] = useState<string>('');
  const [editDeadlineVal, setEditDeadlineVal] = useState<string>('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !goalTarget || +goalTarget <= 0) return;
    const mt = goalMonthlyTarget && +goalMonthlyTarget > 0 ? +goalMonthlyTarget : undefined;
    const dt = goalDeadline.trim() || undefined;
    onAddGoal(goalName.trim(), +goalTarget, dt, mt);
    setGoalName('');
    setGoalTarget('');
    setGoalMonthlyTarget('');
    setGoalDeadline('');
  };

  const handleQuickDeposit = (idx: number, amount: number) => {
    if (amount <= 0) return;
    onDeposit(idx, amount);
  };

  const handleCustomDepositSubmit = (idx: number) => {
    const amt = +customDeposit[idx] || 0;
    if (amt <= 0) return;
    onDeposit(idx, amt);
    setCustomDeposit((prev) => ({ ...prev, [idx]: '' }));
  };

  const handleStartEditGoal = (idx: number, currentMt?: number, currentDt?: string) => {
    setEditingTargetIdx(idx);
    setEditMonthlyTargetVal(currentMt ? String(currentMt) : '');
    setEditDeadlineVal(currentDt || '');
  };

  const handleSaveGoalEdits = (idx: number) => {
    if (!onUpdateGoal) return;
    const newMt =
      editMonthlyTargetVal && +editMonthlyTargetVal > 0 ? +editMonthlyTargetVal : undefined;
    const newDt = editDeadlineVal.trim() || undefined;
    onUpdateGoal(idx, { mt: newMt, dt: newDt });
    setEditingTargetIdx(null);
    setEditMonthlyTargetVal('');
    setEditDeadlineVal('');
  };

  // Helper to calculate deadline details
  const getGoalDeadlineInfo = (dtStr?: string) => {
    if (!dtStr) return null;
    const now = new Date();
    // Normalize target date
    let targetDate: Date;
    if (dtStr.length === 7) {
      // Format: YYYY-MM
      const [y, m] = dtStr.split('-').map(Number);
      targetDate = new Date(y, m, 0, 23, 59, 59); // end of that month
    } else {
      targetDate = new Date(`${dtStr}T23:59:59`);
    }

    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    const isToday = diffDays === 0;

    return {
      dateStr: dtStr,
      diffDays,
      isOverdue,
      isToday,
      monthsLeft: Math.round(diffDays / 30)
    };
  };

  // Urgency score calculation for 'most_urgent' sort
  const getUrgencyScore = (goal: SavingsGoal): number => {
    const target = goal.t || 1;
    const saved = goal.s || 0;
    const pct = Math.min(100, Math.round((saved / target) * 100));
    if (pct >= 100) return -10000; // Completed goals are lowest urgency

    const remaining = Math.max(0, target - saved);
    const deadlineInfo = getGoalDeadlineInfo(goal.dt);

    if (deadlineInfo) {
      if (deadlineInfo.isOverdue) {
        // Overdue goal that is not finished has maximum urgency
        return 1000000 + remaining;
      }
      const days = Math.max(1, deadlineInfo.diffDays);
      // Required daily contribution to achieve goal by deadline
      const dailyRateNeeded = remaining / days;
      // High score for near deadline and large remaining shortfall
      return 50000 + dailyRateNeeded * 30 + (100 - pct) * 20 - days;
    }

    // Goals without deadline: ranked by lack of progress and remaining gap
    return (100 - pct) * 10 + Math.min(remaining / 5000, 500);
  };

  // Metrics
  const totalTargetAll = goals.reduce((acc, g) => acc + (g.t || 0), 0);
  const totalSavedAll = goals.reduce((acc, g) => acc + (g.s || 0), 0);
  const overallPercentage =
    totalTargetAll > 0 ? Math.min(100, Math.round((totalSavedAll / totalTargetAll) * 100)) : 0;

  // Monthly Metrics across all goals
  const totalMonthlyTargetAll = goals.reduce((acc, g) => acc + (g.mt || 0), 0);
  const totalThisMonthSavedAll = deposits.reduce((acc, d) => acc + (+d.a || 0), 0);
  const monthlyOverallPercentage =
    totalMonthlyTargetAll > 0
      ? Math.min(100, Math.round((totalThisMonthSavedAll / totalMonthlyTargetAll) * 100))
      : 0;

  const quickAmounts = [10000, 25000, 50000, 100000];

  // Prepare indexed goals for sorting while preserving original index
  const indexedGoals = goals.map((goal, originalIndex) => ({
    goal,
    originalIndex
  }));

  // Apply sorting
  const sortedIndexedGoals = [...indexedGoals].sort((a, b) => {
    if (sortBy === 'nearest_deadline') {
      const aDt = a.goal.dt;
      const bDt = b.goal.dt;
      // Goals with deadlines come first, sorted earliest to latest
      if (aDt && bDt) return aDt.localeCompare(bDt);
      if (aDt && !bDt) return -1;
      if (!aDt && bDt) return 1;
      return a.originalIndex - b.originalIndex;
    }

    if (sortBy === 'highest_progress') {
      const aPct = (a.goal.s || 0) / (a.goal.t || 1);
      const bPct = (b.goal.s || 0) / (b.goal.t || 1);
      if (bPct !== aPct) return bPct - aPct; // highest % first
      return (b.goal.s || 0) - (a.goal.s || 0);
    }

    if (sortBy === 'most_urgent') {
      const scoreA = getUrgencyScore(a.goal);
      const scoreB = getUrgencyScore(b.goal);
      if (scoreB !== scoreA) return scoreB - scoreA; // highest urgency first
      return a.originalIndex - b.originalIndex;
    }

    // Default order
    return a.originalIndex - b.originalIndex;
  });

  const sortOptionsConfig = [
    {
      id: 'nearest_deadline' as SavingsSortOption,
      label: 'نزیکترین وادە',
      sublabel: 'Nearest Deadline',
      icon: <CalendarClock className="w-4 h-4 text-amber-500" />
    },
    {
      id: 'highest_progress' as SavingsSortOption,
      label: 'بەرزترین پێشکەوتن',
      sublabel: 'Highest Progress',
      icon: <TrendingUp className="w-4 h-4 text-emerald-500" />
    },
    {
      id: 'most_urgent' as SavingsSortOption,
      label: 'بەپەلەترین',
      sublabel: 'Most Urgent',
      icon: <Flame className="w-4 h-4 text-red-500" />
    },
    {
      id: 'default' as SavingsSortOption,
      label: 'ڕیزبەندی سەرەتا',
      sublabel: 'Default Order',
      icon: <ListFilter className="w-4 h-4 text-slate-400" />
    }
  ];

  const currentSortConfig =
    sortOptionsConfig.find((o) => o.id === sortBy) || sortOptionsConfig[3];

  return (
    <div className="space-y-4 pb-14 max-w-4xl mx-auto">
      {/* 1. Hero Overview Card */}
      <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 rounded-2xl p-5 text-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {t('goals') || 'پاشەکەوت و ئامانجەکان'}
              </h2>
              <span className="text-xs text-teal-200">
                پوختەی هەموو ئامانجە داراییەکانت
              </span>
            </div>
          </div>

          <div className="text-end">
            <span className="text-[11px] text-teal-200 block">کۆی پاشەکەوتکراو</span>
            <b className="text-base sm:text-lg font-mono font-bold text-white">
              {fmt(totalSavedAll)} IQD
            </b>
          </div>
        </div>

        {/* Global Lifetime Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-teal-100">
            <span>
              ڕێژەی گەیشتنی گشتی: <b className="text-white font-bold">{overallPercentage}%</b>
            </span>
            <span>
              ئامانجی گشتی: <b className="font-mono text-white">{fmt(totalTargetAll)} IQD</b>
            </span>
          </div>
          <div className="w-full h-2.5 bg-black/20 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-700"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Monthly Target Global Progress Bar (if any monthly targets exist) */}
        {totalMonthlyTargetAll > 0 && (
          <div className="pt-2 border-t border-white/15 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-cyan-100">
              <span className="flex items-center gap-1.5 font-medium">
                <CalendarDays className="w-3.5 h-3.5 text-cyan-300" />
                <span>پاشەکەوتی ئەم مانگە ({currentMonth}):</span>
                <b className="text-white font-mono font-bold">
                  {fmt(totalThisMonthSavedAll)} / {fmt(totalMonthlyTargetAll)} IQD
                </b>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-cyan-200">
                %{monthlyOverallPercentage}
              </span>
            </div>
            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 rounded-full transition-all duration-700"
                style={{ width: `${monthlyOverallPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Create New Goal Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>ئامانجی نوێ دیاری بکە</span>
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            دەتوانیت وادە و ئامانجی مانگانەش دابنێیت
          </span>
        </div>

        <form onSubmit={handleCreateGoal} className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Goal Name */}
            <input
              type="text"
              required
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="ناوی ئامانج (کڕینی سەیارە، گەشت)..."
              className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />

            {/* Goal Total Target */}
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="کۆی ئامانجی گشتی (IQD)..."
              className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />

            {/* Monthly Target */}
            <div className="relative">
              <input
                type="number"
                min="1000"
                step="1000"
                value={goalMonthlyTarget}
                onChange={(e) => setGoalMonthlyTarget(e.target.value)}
                placeholder="ئامانجی مانگانە (IQD)..."
                className="w-full py-2 ps-3 pe-8 bg-slate-50 dark:bg-slate-900 border border-teal-300 dark:border-teal-700/80 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none text-teal-700 dark:text-teal-300"
              />
              <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] text-teal-600 dark:text-teal-400 font-bold pointer-events-none">
                مانگ
              </span>
            </div>

            {/* Deadline / Target Date */}
            <div className="relative">
              <input
                type="month"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                title="وادەی گەیشتن بە ئامانج (Deadline)"
                placeholder="وادەی کۆتایی..."
                className="w-full py-2 ps-3 pe-8 bg-slate-50 dark:bg-slate-900 border border-amber-300 dark:border-amber-700/80 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none text-amber-800 dark:text-amber-200"
              />
              <span className="absolute end-2.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none">
                <CalendarClock className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>دانانی وادە و ئامانجی مانگانە ڕێگەت پێدەدات ئامانجەکان بەپێی بەپەلەیی و نزیکترین وادە ڕیزبکەیت.</span>
            </p>
            <button
              type="submit"
              className="py-2 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer self-end sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add') || 'زیادکردنی ئامانج'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 3. Goals Section Header with Sorting Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>ئامانجە تۆمارکراوەکان</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200">
              {goals.length}
            </span>
          </h3>

          {/* Active Sort Pill Indicator */}
          {sortBy !== 'default' && (
            <button
              type="button"
              onClick={() => setSortBy('default')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition hover:bg-teal-100 dark:hover:bg-teal-900 cursor-pointer"
              title="سڕینەوەی ڕیزبەندی و گەڕانەوە بۆ بنەڕەت"
            >
              <span>{currentSortConfig.label}</span>
              <X className="w-3 h-3 text-teal-500" />
            </button>
          )}
        </div>

        {/* Sorting Dropdown Menu */}
        {goals.length > 0 && (
          <div className="relative self-end sm:self-auto" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer border ${
                sortBy !== 'default'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-teal-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400'
              }`}
              aria-expanded={isSortDropdownOpen}
              aria-label="Sort savings goals"
            >
              <ArrowUpDown className="w-3.5 h-3.5 shrink-0" />
              <span>ڕیزکردن بەپێی:</span>
              <span className="font-semibold underline decoration-dotted underline-offset-2">
                {currentSortConfig.label}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isSortDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Popover */}
            {isSortDropdownOpen && (
              <div className="absolute end-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>هەڵبژاردنی ڕیزبەندی</span>
                  <span className="text-[10px] lowercase font-normal">Sort options</span>
                </div>

                <div className="p-1 space-y-0.5">
                  {sortOptionsConfig.map((opt) => {
                    const isSelected = sortBy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSortBy(opt.id);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`w-full text-start px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isSelected
                                ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {opt.icon}
                          </div>
                          <div>
                            <span className="block">{opt.label}</span>
                            <span className="text-[10px] text-slate-400 font-normal block font-sans">
                              {opt.sublabel}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Goals List */}
      <div className="space-y-3.5">
        {goals.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-700">
            هیچ ئامانجێکی پاشەکەوت تۆمار نەکراوە. لە سەرەوە دەتوانیت یەکەم ئامانج زیاد بکەیت!
          </div>
        ) : (
          sortedIndexedGoals.map(({ goal, originalIndex }, displayRank) => {
            const saved = goal.s || 0;
            const target = goal.t || 1;
            const pct = Math.min(100, Math.round((saved / target) * 100));
            const isCompleted = pct >= 100;

            // Monthly Contribution Calculations for this specific month
            const thisMonthDeposits = deposits.filter((d) => d.g === originalIndex);
            const thisMonthSaved = thisMonthDeposits.reduce((acc, d) => acc + (+d.a || 0), 0);

            const hasMonthlyTarget = Boolean(goal.mt && goal.mt > 0);
            const monthlyTarget = goal.mt || 0;
            const monthlyPct =
              hasMonthlyTarget && monthlyTarget > 0
                ? Math.min(100, Math.round((thisMonthSaved / monthlyTarget) * 100))
                : 0;
            const isMonthlyCompleted = hasMonthlyTarget && thisMonthSaved >= monthlyTarget;
            const monthlyRemaining = Math.max(0, monthlyTarget - thisMonthSaved);

            const isEditingThisTarget = editingTargetIdx === originalIndex;

            // Deadline info
            const deadlineInfo = getGoalDeadlineInfo(goal.dt);

            return (
              <div
                key={originalIndex}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border transition space-y-4 ${
                  sortBy === 'most_urgent' && !isCompleted && displayRank === 0
                    ? 'border-red-400/80 dark:border-red-700/80 ring-1 ring-red-400/40'
                    : sortBy === 'highest_progress' && displayRank === 0
                    ? 'border-emerald-400/80 dark:border-emerald-700/80'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300'
                          : 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 truncate block">
                          {goal.n}
                        </b>

                        {/* Rank indicator when sorted */}
                        {sortBy === 'highest_progress' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold">
                            #{displayRank + 1}
                          </span>
                        )}
                        {sortBy === 'most_urgent' && !isCompleted && displayRank === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 flex items-center gap-1 animate-pulse">
                            <Flame className="w-3 h-3 text-red-500" />
                            <span>بەپەلەترین ئامانج</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400 pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          {isCompleted ? (
                            <>
                              <Trophy className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>ئامانجی گشتی تەواوبووە</span>
                            </>
                          ) : (
                            'لە کاردایە'
                          )}
                        </span>

                        {/* Deadline Badge */}
                        {deadlineInfo && (
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-medium px-2 py-0.5 rounded-md ${
                              deadlineInfo.isOverdue
                                ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60'
                                : deadlineInfo.diffDays <= 30
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                                : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <CalendarClock className="w-3 h-3" />
                            <span>وادە: {deadlineInfo.dateStr}</span>
                            <span>
                              {deadlineInfo.isOverdue
                                ? '(تێپەڕیوە!)'
                                : deadlineInfo.isToday
                                ? '(ئەمڕۆیە!)'
                                : `(ماوە: ${deadlineInfo.diffDays} ڕۆژ)`}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      کۆی گشتی: %{pct}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(originalIndex)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
                      title={t('del') || 'سڕینەوە'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 1. Overall Lifetime Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>
                      کۆی پاشەکەوتکراو:{' '}
                      <b className="font-mono text-slate-800 dark:text-slate-100 font-bold">
                        {fmt(saved)} IQD
                      </b>
                    </span>
                    <span>
                      ئامانجی گشتی:{' '}
                      <b className="font-mono text-slate-600 dark:text-slate-300">
                        {fmt(target)} IQD
                      </b>
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isCompleted ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* 2. SPECIFIC MONTH'S CONTRIBUTION & MONTHLY TARGET PROGRESS BAR */}
                <div className="bg-gradient-to-r from-teal-50/70 via-cyan-50/50 to-emerald-50/70 dark:from-teal-950/30 dark:via-cyan-950/20 dark:to-emerald-950/30 border border-teal-200/90 dark:border-teal-800/60 rounded-xl p-3 sm:p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        بەشداریی مانگی ({currentMonth})
                      </span>
                      {hasMonthlyTarget && isMonthlyCompleted && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ئامانجی مانگ تەواوە!</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {hasMonthlyTarget && (
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isMonthlyCompleted
                              ? 'bg-emerald-500 text-white shadow-2xs'
                              : 'bg-teal-600 text-white font-mono'
                          }`}
                        >
                          %{monthlyPct}
                        </span>
                      )}
                      {onUpdateGoal && !isEditingThisTarget && (
                        <button
                          type="button"
                          onClick={() => handleStartEditGoal(originalIndex, goal.mt, goal.dt)}
                          className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] hover:bg-white/60 dark:hover:bg-slate-800/60"
                          title="دەستکاریکردنی ئامانجی مانگانە و وادە"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">دەستکاری</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Monthly Target & Deadline Editor Form */}
                  {isEditingThisTarget ? (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-teal-300 dark:border-teal-700 space-y-2.5 animate-in fade-in duration-150 shadow-xs">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        دەستکاریکردنی ئامانجی مانگانە و وادەی کۆتایی:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                            ئامانجی مانگانە (IQD):
                          </label>
                          <input
                            type="number"
                            min="1000"
                            step="1000"
                            autoFocus
                            value={editMonthlyTargetVal}
                            onChange={(e) => setEditMonthlyTargetVal(e.target.value)}
                            placeholder="بڕی پارەی مانگانە..."
                            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                            وادەی کۆتایی / مانگ (Deadline):
                          </label>
                          <input
                            type="month"
                            value={editDeadlineVal}
                            onChange={(e) => setEditDeadlineVal(e.target.value)}
                            className="w-full py-1.5 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveGoalEdits(originalIndex)}
                            className="py-1.5 px-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            تۆمارکردن
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTargetIdx(null);
                              setEditMonthlyTargetVal('');
                              setEditDeadlineVal('');
                            }}
                            className="py-1.5 px-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            داخستن
                          </button>
                        </div>

                        {goal.mt && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateGoal) onUpdateGoal(originalIndex, { mt: undefined });
                              setEditingTargetIdx(null);
                              setEditMonthlyTargetVal('');
                            }}
                            className="text-[11px] text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                          >
                            سڕینەوەی ئامانجی مانگانە
                          </button>
                        )}
                      </div>
                    </div>
                  ) : hasMonthlyTarget ? (
                    /* Display Monthly Progress Bar */
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>
                          پاشەکەوتی ئەم مانگە:{' '}
                          <b className="font-mono text-teal-700 dark:text-teal-300 font-bold">
                            {fmt(thisMonthSaved)} IQD
                          </b>
                        </span>
                        <span>
                          ئامانجی مانگ:{' '}
                          <b className="font-mono text-slate-800 dark:text-slate-100 font-bold">
                            {fmt(monthlyTarget)} IQD
                          </b>
                        </span>
                      </div>

                      {/* Monthly Progress Bar Track */}
                      <div className="w-full h-2.5 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isMonthlyCompleted
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : 'bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-400'
                          }`}
                          style={{ width: `${monthlyPct}%` }}
                        />
                      </div>

                      {/* Quick 1-tap fulfill monthly target button */}
                      {!isMonthlyCompleted && monthlyRemaining > 0 && (
                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">
                            ماوە بۆ تەواوکردنی مانگ:{' '}
                            <b className="font-mono text-slate-700 dark:text-slate-200">
                              {fmt(monthlyRemaining)} IQD
                            </b>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleQuickDeposit(originalIndex, monthlyRemaining)}
                            className="text-teal-700 dark:text-teal-300 hover:text-teal-800 font-bold bg-teal-100/70 dark:bg-teal-900/60 hover:bg-teal-100 dark:hover:bg-teal-900 px-2 py-0.5 rounded-md transition cursor-pointer"
                          >
                            + تەواوکردن ({fmt(monthlyRemaining)} IQD)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Prompt to Set Monthly Target */
                    <div className="flex items-center justify-between py-1 text-xs text-slate-500">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        ئەم ئامانجە هیچ ئامانجێکی مانگانەی بۆ دیاری نەکراوە.
                      </span>
                      {onUpdateGoal && (
                        <button
                          type="button"
                          onClick={() => handleStartEditGoal(originalIndex, undefined, goal.dt)}
                          className="py-1 px-2.5 bg-teal-100 hover:bg-teal-200 dark:bg-teal-900/70 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-200 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>دیاریکردنی ئامانجی مانگانە</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Quick One-Tap Deposit Button, Chips & Custom Input */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Dedicated Quick Deposit Button */}
                    <button
                      type="button"
                      onClick={() => handleTriggerQuickDeposit(originalIndex, predefinedQuickDeposit)}
                      className="py-1.5 px-3 bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      title={`دانانی خێرای ${fmt(predefinedQuickDeposit)} دینار بە یەک کلیک بێ مۆداڵ`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>دانانی خێرا (+{fmt(predefinedQuickDeposit)} IQD)</span>
                    </button>

                    {/* Instant Feedback Badge */}
                    {lastDepositedGoal === originalIndex && (
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-lg animate-in fade-in zoom-in-95 flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>+{fmt(lastDepositedAmount)} IQD دانرا!</span>
                      </span>
                    )}

                    {/* Additional Quick Amount Presets */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {quickAmounts.map((qAmt) => (
                        <button
                          key={qAmt}
                          type="button"
                          onClick={() => handleTriggerQuickDeposit(originalIndex, qAmt)}
                          className="py-1 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-mono font-semibold transition shrink-0 cursor-pointer active:scale-95"
                          title={`دانانی خێرای +${fmt(qAmt)} IQD`}
                        >
                          +{qAmt >= 1000 ? `${qAmt / 1000}k` : qAmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Deposit Input */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="بڕی تر..."
                      value={customDeposit[originalIndex] || ''}
                      onChange={(e) =>
                        setCustomDeposit({ ...customDeposit, [originalIndex]: e.target.value })
                      }
                      className="w-24 sm:w-28 py-1 px-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCustomDepositSubmit(originalIndex)}
                      disabled={
                        !customDeposit[originalIndex] || +customDeposit[originalIndex] <= 0
                      }
                      className="py-1 px-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      {t('dep') || 'دانان'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. This Month's Deposit History */}
      {deposits.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>پاشەکەوتکراوەکانی ئەم مانگە ({currentMonth})</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {deposits.map((dep, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-[11px]">{dep.d}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {goals[dep.g]?.n || 'ئامانج'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <b className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{fmt(dep.a)} IQD
                  </b>
                  <button
                    type="button"
                    onClick={() => onUndoDeposit(i)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-750 transition cursor-pointer"
                    title={t('udo') || 'پاشگەزبوونەوە'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
