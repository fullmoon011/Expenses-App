import React from 'react';
import {
  Receipt,
  Plus,
  BarChart3,
  PiggyBank,
  Gem,
  ShoppingBasket,
  LayoutGrid,
  Settings
} from 'lucide-react';
import { haptics } from '../utils/haptics';

export type TabKey =
  | 'expenses'
  | 'reports'
  | 'wealth'
  | 'more'
  | 'settings'
  | 'savings'
  | 'shopping';

interface BottomNavProps {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  onOpenAddExpense?: () => void;
  t: (key: string) => string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddExpense,
  t
}) => {
  // 2 tabs on the left side: reports, wealth
  const leftTabs: { key: TabKey; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'reports', labelKey: 'nr', icon: <BarChart3 className="w-5 h-5" /> },
    { key: 'wealth', labelKey: 'nw', icon: <Gem className="w-5 h-5" /> },
  ];

  // 2 tabs on the right side: savings (PiggyBank), more (Apps hub)
  const rightTabs: { key: TabKey; labelKey: string; icon: React.ReactNode }[] = [
    { key: 'savings', labelKey: 'ns', icon: <PiggyBank className="w-5 h-5" /> },
    { key: 'more', labelKey: 'mre', icon: <LayoutGrid className="w-5 h-5" /> },
  ];

  const isExpenseActive = activeTab === 'expenses';

  const handleCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    haptics.medium();
    if (!isExpenseActive) {
      onChangeTab('expenses');
    } else if (onOpenAddExpense) {
      onOpenAddExpense();
    }
  };

  const handleQuickAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.medium();
    if (onOpenAddExpense) {
      onOpenAddExpense();
    } else {
      onChangeTab('expenses');
    }
  };

  const renderTabButton = (tab: { key: TabKey; labelKey: string; icon: React.ReactNode }) => {
    const isActive =
      activeTab === tab.key ||
      (tab.key === 'more' && activeTab === 'shopping');

    return (
      <button
        key={tab.key}
        type="button"
        onClick={() => {
          haptics.light();
          onChangeTab(tab.key);
        }}
        className={`flex-1 min-w-[50px] max-w-[80px] py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
          isActive
            ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20 scale-102 shadow-2xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
        }`}
      >
        <span className={`transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}>
          {tab.icon}
        </span>
        <span className="truncate max-w-[64px] text-center leading-tight">
          {t(tab.labelKey)}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] px-3 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] transition-all">
      <div className="max-w-4xl mx-auto flex items-end justify-between gap-1 relative">
        {/* Left 2 tabs */}
        <div className="flex-1 flex items-center justify-around gap-1">
          {leftTabs.map(renderTabButton)}
        </div>

        {/* Center Prominent Elevated Expense Button */}
        <div className="relative -mt-6 sm:-mt-7 flex flex-col items-center justify-center shrink-0 px-2 z-10">
          <div className="relative group">
            <button
              type="button"
              onClick={handleCenterClick}
              title={isExpenseActive ? `${t('ne')} - ${t('newx')}` : t('ne')}
              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-200 transform active:scale-90 cursor-pointer ${
                isExpenseActive
                  ? 'bg-gradient-to-tr from-[#064e3b] via-[#047857] to-emerald-500 shadow-emerald-900/40 ring-4 ring-white dark:ring-slate-900 scale-105'
                  : 'bg-gradient-to-tr from-slate-900 via-teal-800 to-emerald-700 shadow-slate-900/30 ring-4 ring-white dark:ring-slate-900 opacity-95 hover:opacity-100 hover:scale-102'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Receipt className="w-6 h-6 stroke-[2.2]" />
                {/* Embedded dynamic plus indicator */}
                <span className="absolute -bottom-1 -end-1 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 rounded-full p-0.5 shadow-xs">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </span>
              </div>
            </button>

            {/* Quick 1-tap dedicated Add modal launcher badge */}
            {onOpenAddExpense && (
              <button
                type="button"
                onClick={handleQuickAddClick}
                title={t('newx')}
                aria-label={t('newx')}
                className="absolute -top-1 -start-1 w-5 h-5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-900 transition-transform active:scale-75 cursor-pointer"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
              </button>
            )}
          </div>

          <span
            onClick={handleCenterClick}
            className={`text-[10px] sm:text-[11px] font-black truncate max-w-[68px] text-center mt-1 cursor-pointer transition-colors ${
              isExpenseActive
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {t('ne')}
          </span>
        </div>

        {/* Right 2 tabs */}
        <div className="flex-1 flex items-center justify-around gap-1">
          {rightTabs.map(renderTabButton)}
        </div>
      </div>
    </nav>
  );
};
