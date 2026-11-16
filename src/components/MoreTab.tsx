import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  X,
  Coins,
  ShieldCheck,
  TrendingDown,
  Info,
  ShoppingBasket,
  Users,
  PartyPopper,
  CalendarHeart,
  Bell,
  Clock,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Check,
  DollarSign,
  Calendar,
  Sparkles,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Tag,
  CircleDollarSign,
  HandCoins,
  Receipt
} from 'lucide-react';
import { SinkingFundItem, ShopItem, KumalaItem, EventItem, ImportantDateItem } from '../types';
import { fmt, shiftMonth, getDaysDifference } from '../utils/calculations';
import { CurrencyConverter } from './CurrencyConverter';
import { ShoppingTab } from './ShoppingTab';

export type AppToolKey = 'all' | 'shopping' | 'converter' | 'sinking' | 'kumala' | 'events' | 'dates';

interface MoreTabProps {
  currentMonth: string;
  fxRate: number;
  sinkingFunds: SinkingFundItem[];
  onAddSinkingFund: (name: string, yearlyAmount: number) => void;
  onDeleteSinkingFund: (index: number) => void;
  t: (key: string) => string;
  shoppingItems?: ShopItem[];
  onAddShopItem?: (name: string, qty: string, price: number) => void;
  onBulkAddShop?: (names: string[]) => void;
  onToggleShopItem?: (index: number) => void;
  onDeleteShopItem?: (index: number) => void;
  onClearCheckedShop?: () => void;
  onConvertCheckedShopToExpense?: (checkedTotal: number, note: string) => void;
  initialTool?: AppToolKey;
  kumala?: KumalaItem[];
  events?: EventItem[];
  dates?: ImportantDateItem[];
  onAddKumala?: (item: KumalaItem) => void;
  onPayKumalaMonth?: (kumalaIndex: number, monthStepIndex: number) => void;
  onReceiveKumalaPot?: (kumalaIndex: number) => void;
  onDeleteKumala?: (index: number) => void;
  onAddEvent?: (event: EventItem) => void;
  onAddEventItem?: (eventIndex: number, name: string, price: number) => void;
  onToggleEventItem?: (eventIndex: number, itemIndex: number) => void;
  onDeleteEventItem?: (eventIndex: number, itemIndex: number) => void;
  onDepositEvent?: (eventIndex: number, amount: number) => void;
  onDeleteEvent?: (index: number) => void;
  onAddDate?: (item: ImportantDateItem) => void;
  onDeleteDate?: (index: number) => void;
}

export const MoreTab: React.FC<MoreTabProps> = ({
  currentMonth,
  fxRate,
  sinkingFunds = [],
  onAddSinkingFund,
  onDeleteSinkingFund,
  t,
  shoppingItems = [],
  onAddShopItem = () => {},
  onBulkAddShop = () => {},
  onToggleShopItem = () => {},
  onDeleteShopItem = () => {},
  onClearCheckedShop = () => {},
  onConvertCheckedShopToExpense = () => {},
  initialTool = 'all',
  kumala = [],
  events = [],
  dates = [],
  onAddKumala = () => {},
  onPayKumalaMonth = () => {},
  onReceiveKumalaPot = () => {},
  onDeleteKumala = () => {},
  onAddEvent = () => {},
  onAddEventItem = () => {},
  onToggleEventItem = () => {},
  onDeleteEventItem = () => {},
  onDepositEvent = () => {},
  onDeleteEvent = () => {},
  onAddDate = () => {},
  onDeleteDate = () => {}
}) => {
  const [activeTool, setActiveTool] = useState<AppToolKey>(initialTool);
  const [searchQuery, setSearchQuery] = useState('');

  // Sinking Fund Form State
  const [sfName, setSfName] = useState('');
  const [sfAmount, setSfAmount] = useState('');

  // Kumala Form State
  const [showAddKumala, setShowAddKumala] = useState(false);
  const [kName, setKName] = useState('');
  const [kAmount, setKAmount] = useState('');
  const [kMembers, setKMembers] = useState('10');
  const [kStartMonth, setKStartMonth] = useState(currentMonth);
  const [kMyTurn, setKMyTurn] = useState('1');
  const [kPayDay, setKPayDay] = useState('1');

  // Event Form State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [evName, setEvName] = useState('');
  const [evBudget, setEvBudget] = useState('');
  const [evDate, setEvDate] = useState('');
  const [newEventItemName, setNewEventItemName] = useState<Record<number, string>>({});
  const [newEventItemPrice, setNewEventItemPrice] = useState<Record<number, string>>({});

  // Important Dates Form State
  const [showAddDate, setShowAddDate] = useState(false);
  const [dtName, setDtName] = useState('');
  const [dtDate, setDtDate] = useState(new Date().toISOString().slice(0, 10));
  const [dtRemindDays, setDtRemindDays] = useState('3');
  const [dtYearly, setDtYearly] = useState(true);

  // Sinking Fund Submit Handler
  const handleSinkingFundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sfName.trim() || !sfAmount || +sfAmount <= 0) return;
    onAddSinkingFund(sfName.trim(), +sfAmount);
    setSfName('');
    setSfAmount('');
  };

  // Kumala Submit Handler
  const handleKumalaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kName.trim() || !kAmount || +kAmount <= 0 || +kMembers <= 1) return;
    const membersCount = +kMembers;
    const item: KumalaItem = {
      n: kName.trim(),
      a: +kAmount,
      m: membersCount,
      s: kStartMonth,
      t: Math.min(membersCount, Math.max(1, +kMyTurn || 1)),
      dd: Math.min(31, Math.max(1, +kPayDay || 1)),
      pd: Array(membersCount).fill(0),
      rc: 0
    };
    onAddKumala(item);
    setKName('');
    setKAmount('');
    setShowAddKumala(false);
  };

  // Event Submit Handler
  const handleEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evName.trim() || !evBudget || +evBudget <= 0) return;
    const item: EventItem = {
      n: evName.trim(),
      b: +evBudget,
      sv: 0,
      d: evDate || undefined,
      it: []
    };
    onAddEvent(item);
    setEvName('');
    setEvBudget('');
    setEvDate('');
    setShowAddEvent(false);
  };

  const handleAddEventItemSubmit = (evIdx: number) => {
    const name = newEventItemName[evIdx]?.trim();
    const price = +newEventItemPrice[evIdx] || 0;
    if (!name) return;
    onAddEventItem(evIdx, name, price);
    setNewEventItemName(prev => ({ ...prev, [evIdx]: '' }));
    setNewEventItemPrice(prev => ({ ...prev, [evIdx]: '' }));
  };

  // Date Submit Handler
  const handleDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtName.trim() || !dtDate) return;
    const item: ImportantDateItem = {
      n: dtName.trim(),
      d: dtDate,
      rd: +dtRemindDays || 3,
      y: dtYearly ? 1 : 0
    };
    onAddDate(item);
    setDtName('');
    setShowAddDate(false);
  };

  const totalYearlySinking = sinkingFunds.reduce((acc, sf) => acc + (sf.a || 0), 0);
  const totalSinkingPerMonth = totalYearlySinking / 12;
  const uncheckedShopCount = shoppingItems.filter(i => !i.ck).length;

  // Mini-apps registry definition
  const apps = [
    {
      id: 'shopping' as AppToolKey,
      title: t('shp') || 'لیستی بازاڕ',
      enTitle: 'Shopping List',
      desc: 'نووسینی پێداویستی بازاڕ و کڕینەکان لەگەڵ گۆڕینی خێرا بۆ خەرجی',
      icon: ShoppingBasket,
      gradient: 'from-emerald-600 to-teal-700',
      badge: uncheckedShopCount > 0 ? `${uncheckedShopCount} کاڵا` : undefined,
      stat: `${shoppingItems.length} دانە تۆمارکراوە`,
      color: 'emerald'
    },
    {
      id: 'converter' as AppToolKey,
      title: t('fx') || 'گۆڕینەوەی دراو و نرخ',
      enTitle: 'Currency & Rates',
      desc: 'حاسیبەی دۆلار و دینار بە نرخی دیاریکراو و نرخی زێڕ بە مسقاڵ',
      icon: Coins,
      gradient: 'from-amber-500 to-orange-600',
      badge: '100$ = ' + fmt(Math.round(fxRate * 100)) + ' د.ع',
      stat: 'نرخی ڕۆژ',
      color: 'amber'
    },
    {
      id: 'sinking' as AppToolKey,
      title: t('sink') || 'سندوقی خەرجییە ساڵانەکان',
      enTitle: 'Sinking Funds',
      desc: 'دابەشکردنی خەرجییە گەورە ساڵانەکان (وەک سەیارە، بیمە، خوێندن) بەسەر مانگەکاندا',
      icon: CalendarClock,
      gradient: 'from-indigo-600 to-blue-700',
      badge: sinkingFunds.length > 0 ? `${sinkingFunds.length} سندوق` : undefined,
      stat: `مانگانە: ${fmt(Math.round(totalSinkingPerMonth))} د.ع`,
      color: 'indigo'
    },
    {
      id: 'kumala' as AppToolKey,
      title: 'کۆمەڵەی دارایی',
      enTitle: 'Kumala / ROSCA',
      desc: 'بەڕێوەبردنی خولی کۆمەڵەی هاوڕێیان و خێزانی، پارەدانەکان و وەرگرتنی کاسە',
      icon: Users,
      gradient: 'from-purple-600 to-violet-700',
      badge: kumala.length > 0 ? `${kumala.length} کۆمەڵە` : undefined,
      stat: 'پاشەکەوتی هاوبەش',
      color: 'purple'
    },
    {
      id: 'events' as AppToolKey,
      title: 'بۆنە و پڕۆژەکان',
      enTitle: 'Event Budgets',
      desc: 'ڕێکخستنی بودجە بۆ جەژن، ئاهەنگ، سەفەر، نەشتەرگەری و کڕینی گەورە',
      icon: PartyPopper,
      gradient: 'from-rose-500 to-pink-600',
      badge: events.length > 0 ? `${events.length} بۆنە` : undefined,
      stat: 'بەڕێوەبردنی تێچوو',
      color: 'rose'
    },
    {
      id: 'dates' as AppToolKey,
      title: 'بەروارە داراییەکان',
      enTitle: 'Important Dates',
      desc: 'بیرهێنانەوەی کاتی مووچە، کرێی خانوو، قیستی قەرز و وادەی فەرمی',
      icon: Bell,
      gradient: 'from-cyan-600 to-blue-600',
      badge: dates.length > 0 ? `${dates.length} بەروار` : undefined,
      stat: 'ئاگادارکردنەوە',
      color: 'cyan'
    }
  ];

  const filteredApps = apps.filter(
    app =>
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.enTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentAppMeta = apps.find(a => a.id === activeTool);

  return (
    <div className="space-y-4 pb-16 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Top App Bar Navigation / Quick Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTool('all')}
          className={`shrink-0 py-2 px-3.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTool === 'all'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>هەموو ئەپەکان ({apps.length})</span>
        </button>

        {apps.map(app => {
          const Icon = app.icon;
          const isActive = activeTool === app.id;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => setActiveTool(app.id)}
              className={`shrink-0 py-2 px-3 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{app.title}</span>
              {app.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  {app.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VIEW 1: ALL APPS HUB / APP LAUNCHER */}
      {activeTool === 'all' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white rounded-2xl p-5 shadow-sm border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 end-0 -mt-6 -me-6 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white">ئەپەکان و ئامرازە داراییەکان</h2>
                </div>
                <p className="text-xs text-slate-300 max-w-xl">
                  کۆمەڵێک ئەپی تایبەتمەند بۆ ڕێکخستنی کڕینی بازاڕ، کۆمەڵەی دارایی، بودجەی بۆنەکان، سندوقی ساڵانە و بەروارە گرنگەکان.
                </p>
              </div>

              {/* Live Search in Apps */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="گەڕان لەناو ئەپەکاندا..."
                  className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-xl ps-9 pe-3 py-2 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Apps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredApps.map(app => {
              const Icon = app.icon;
              return (
                <div
                  key={app.id}
                  onClick={() => setActiveTool(app.id)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 hover:border-teal-400/60 dark:hover:border-teal-500/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-start gap-3.5">
                    {/* App Squircle Icon */}
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${app.gradient} text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-200`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.1]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <b className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                          {app.title}
                        </b>
                        {app.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0 font-mono">
                            {app.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium mb-1">{app.enTitle}</div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {app.desc}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">{app.stat}</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <span>کردنەوە</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:hidden" />
                      <ArrowLeft className="w-3.5 h-3.5 ltr:hidden" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: ACTIVE APP INTERFACE WITH TOP HEADER & BACK BUTTON */}
      {activeTool !== 'all' && (
        <div className="space-y-4">
          {/* App Header Bar with Back Button */}
          {currentAppMeta && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTool('all')}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                  title="گەڕانەوە بۆ هەموو ئەپەکان"
                >
                  <ArrowLeft className="w-4 h-4 rtl:hidden" />
                  <ArrowRight className="w-4 h-4 ltr:hidden" />
                  <span>هەموو ئەپەکان</span>
                </button>

                <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${currentAppMeta.gradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    {React.createElement(currentAppMeta.icon, { className: 'w-4 h-4 stroke-[2.2]' })}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentAppMeta.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">{currentAppMeta.enTitle}</p>
                  </div>
                </div>
              </div>

              {currentAppMeta.badge && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/70 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-mono shrink-0">
                  {currentAppMeta.badge}
                </span>
              )}
            </div>
          )}

          {/* 1. SHOPPING LIST APP */}
          {activeTool === 'shopping' && (
            <ShoppingTab
              items={shoppingItems}
              onAddItem={onAddShopItem}
              onBulkAdd={onBulkAddShop}
              onToggleCheck={onToggleShopItem}
              onDeleteItem={onDeleteShopItem}
              onClearChecked={onClearCheckedShop}
              onConvertCheckedToExpense={onConvertCheckedShopToExpense}
              t={t}
            />
          )}

          {/* 2. CURRENCY & FX CONVERTER APP */}
          {activeTool === 'converter' && <CurrencyConverter fxRate={fxRate} t={t} />}

          {/* 3. SINKING FUNDS APP */}
          {activeTool === 'sinking' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CalendarClock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      {t('sink') || 'سندوقی خەرجییە ساڵانەکان'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      خەرجییە گەورە ساڵانەکان (وەک ڕیسوماتی سەیارە، بیمە، خوێندن) دابەش دەکات بەسەر ۱۲ مانگدا
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl px-3 py-1.5 flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                    پێویستی مانگانە:
                  </span>
                  <b className="font-mono text-xs sm:text-sm text-indigo-700 dark:text-indigo-200">
                    {fmt(Math.round(totalSinkingPerMonth))} IQD
                  </b>
                </div>
              </div>

              {sinkingFunds.length > 0 ? (
                <div className="space-y-2">
                  {sinkingFunds.map((sf, idx) => {
                    const monthlyCost = Math.round(sf.a / 12);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <b className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                              {sf.n}
                            </b>
                            <span className="text-[10px] text-slate-400 font-mono">
                              (ساڵانە: {fmt(sf.a)} IQD)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-end">
                            <b className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono block">
                              +{fmt(monthlyCost)} IQD
                            </b>
                            <span className="text-[10px] text-slate-400 block">مانگانە</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteSinkingFund(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition hover:bg-slate-200 dark:hover:bg-slate-750 cursor-pointer"
                            title={t('del') || 'سڕینەوە'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  هیچ خەرجییەکی ساڵانە دیاری نەکراوە. بۆ نموونە: «ساڵیانەی سەیارە» یان «قیستی زانکۆ».
                </div>
              )}

              <form onSubmit={handleSinkingFundSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <input
                  type="text"
                  required
                  value={sfName}
                  onChange={e => setSfName(e.target.value)}
                  placeholder="ناوی خەرجی ساڵانە (وەک: ساڵیانەی سەیارە)..."
                  className="sm:col-span-1 py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={sfAmount}
                  onChange={e => setSfAmount(e.target.value)}
                  placeholder="کۆی بڕی ساڵانە بە دینار..."
                  className="sm:col-span-1 py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('add') || 'زیادکردن'}</span>
                </button>
              </form>
            </div>
          )}

          {/* 4. KUMALA APP */}
          {activeTool === 'kumala' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      کۆمەڵەی دارایی (Rotating Savings)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      بەڕێوەبردنی خولەکانی کۆمەڵەی هاوڕێیان، مانگەکانی دراو، و وەرگرتنی کاسەی پارەکە
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddKumala(!showAddKumala)}
                  className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>کۆمەڵەی نوێ</span>
                </button>
              </div>

              {/* Add Kumala Modal / Form */}
              {showAddKumala && (
                <form
                  onSubmit={handleKumalaSubmit}
                  className="p-4 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-3"
                >
                  <div className="font-bold text-xs text-purple-900 dark:text-purple-200">
                    زیادکردنی کۆمەڵەیەکی دارایی نوێ
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        ناوی کۆمەڵە:
                      </label>
                      <input
                        type="text"
                        required
                        value={kName}
                        onChange={e => setKName(e.target.value)}
                        placeholder="وەک: کۆمەڵەی فەرمانگە..."
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        پارەی مانگانە (IQD):
                      </label>
                      <input
                        type="number"
                        min="5000"
                        step="5000"
                        required
                        value={kAmount}
                        onChange={e => setKAmount(e.target.value)}
                        placeholder="100,000"
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        ژمارەی ئەندامان (مانگەکان):
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="36"
                        required
                        value={kMembers}
                        onChange={e => setKMembers(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        مانگی دەستپێکردن:
                      </label>
                      <input
                        type="month"
                        required
                        value={kStartMonth}
                        onChange={e => setKStartMonth(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        نۆرەی تۆ لە کام مانگە؟:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={kMembers}
                        required
                        value={kMyTurn}
                        onChange={e => setKMyTurn(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        ڕۆژی پارەدان لە مانگدا:
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        value={kPayDay}
                        onChange={e => setKPayDay(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddKumala(false)}
                      className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300"
                    >
                      پاشگەزبوونەوە
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                    >
                      تۆمارکردن
                    </button>
                  </div>
                </form>
              )}

              {/* Kumala Items */}
              {kumala.length > 0 ? (
                <div className="space-y-3">
                  {kumala.map((k, kIdx) => {
                    const totalPot = k.a * k.m;
                    const paidCount = k.pd.filter(Boolean).length;
                    const myTurnMonth = shiftMonth(k.s, k.t - 1);
                    const isMyTurnNow = myTurnMonth === currentMonth;

                    return (
                      <div
                        key={kIdx}
                        className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <b className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                              {k.n}
                            </b>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-medium">
                              کاسەی گشتی: {fmt(totalPot)} IQD
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onDeleteKumala(kIdx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                          <div>
                            <span>بڕی مانگانە:</span>{' '}
                            <b className="text-slate-800 dark:text-slate-200 font-mono">{fmt(k.a)} IQD</b>
                          </div>
                          <div>
                            <span>نۆرەی تۆ:</span>{' '}
                            <b className="text-purple-600 dark:text-purple-400 font-bold">
                              {k.t} لە {k.m} ({myTurnMonth})
                            </b>
                          </div>
                          <div>
                            <span>ڕۆژی مانگ:</span>{' '}
                            <b className="text-slate-800 dark:text-slate-200 font-mono">{k.dd}</b>
                          </div>
                          <div>
                            <span>مانگی دەستپێک:</span>{' '}
                            <b className="text-slate-800 dark:text-slate-200 font-mono">{k.s}</b>
                          </div>
                        </div>

                        {/* Pot Claim Section */}
                        {isMyTurnNow && !k.rc && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                            <div className="text-xs">
                              <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                                ئەمرۆ نۆرەی تۆیە لەم مانگەدا ({currentMonth})! 🎉
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">
                                کاسەی کۆمەڵەکە ({fmt(totalPot)} IQD) وەربگرە و بیخەرە سەر داهاتی مانگت.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => onReceiveKumalaPot(kIdx)}
                              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                            >
                              وەرگرتنی کاسە
                            </button>
                          </div>
                        )}

                        {k.rc === 1 && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>کاسەی ئەم کۆمەڵەیە وەرگیراوە و خراوەتە ناو داهاتەوە ✓</span>
                          </div>
                        )}

                        {/* Month by month tracking steps */}
                        <div className="pt-1">
                          <span className="text-[11px] text-slate-400 block mb-1.5">
                            مانگەکانی کۆمەڵەکە (کرتە بکە بۆ تۆمارکردنی پارەدانی ئەم مانگە):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: k.m }).map((_, stepIdx) => {
                              const stepMonth = shiftMonth(k.s, stepIdx);
                              const isPaid = !!k.pd[stepIdx];
                              const isMine = stepIdx + 1 === k.t;
                              return (
                                <button
                                  key={stepIdx}
                                  type="button"
                                  onClick={() => !isPaid && onPayKumalaMonth(kIdx, stepIdx)}
                                  disabled={isPaid}
                                  className={`py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                                    isPaid
                                      ? 'bg-purple-600 text-white cursor-default'
                                      : isMine
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 hover:bg-amber-200'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                                  }`}
                                  title={`${stepMonth} - ${isPaid ? 'دراوە' : 'نەدراوە'}`}
                                >
                                  {isPaid && <Check className="w-2.5 h-2.5" />}
                                  <span>
                                    {stepMonth.slice(5)}
                                    {isMine ? ' ⭐' : ''}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  هیچ کۆمەڵەیەکی دارایی تۆمار نەکراوە. دوگمەی «کۆمەڵەی نوێ» دابگرە بۆ دەستپێکردن.
                </div>
              )}
            </div>
          )}

          {/* 5. EVENTS BUDGETS APP */}
          {activeTool === 'events' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <PartyPopper className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      بودجەی بۆنە و پڕۆژە تایبەتەکان
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      دیاریکردنی بودجەی جەژن، ئاهەنگ، سەفەر، نەشتەرگەری و کڕینی کەلوپەلی ماڵ
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddEvent(!showAddEvent)}
                  className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>بۆنەی نوێ</span>
                </button>
              </div>

              {/* Add Event Form */}
              {showAddEvent && (
                <form
                  onSubmit={handleEventSubmit}
                  className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl space-y-3"
                >
                  <div className="font-bold text-xs text-rose-900 dark:text-rose-200">
                    تۆمارکردنی بۆنە یان پڕۆژەی نوێ
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        ناوی بۆنە:
                      </label>
                      <input
                        type="text"
                        required
                        value={evName}
                        onChange={e => setEvName(e.target.value)}
                        placeholder="وەک: سەفەری تورکیا، جەژنی نەورۆز..."
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        بودجەی مەزەندەکراو (IQD):
                      </label>
                      <input
                        type="number"
                        min="10000"
                        step="10000"
                        required
                        value={evBudget}
                        onChange={e => setEvBudget(e.target.value)}
                        placeholder="1,500,000"
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        بەرواری بۆنەکە (ئارەزوومەندانە):
                      </label>
                      <input
                        type="date"
                        value={evDate}
                        onChange={e => setEvDate(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddEvent(false)}
                      className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300"
                    >
                      پاشگەزبوونەوە
                    </button>
                    <button
                      type="submit"
                      className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                    >
                      تۆمارکردن
                    </button>
                  </div>
                </form>
              )}

              {/* Event Cards */}
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((ev, evIdx) => {
                    const itemsSpent = ev.it.filter(i => i.ck).reduce((acc, i) => acc + (i.pr || 0), 0);
                    const totalCost = ev.it.reduce((acc, i) => acc + (i.pr || 0), 0);
                    const pct = ev.b > 0 ? Math.min(100, Math.round((itemsSpent / ev.b) * 100)) : 0;

                    return (
                      <div
                        key={evIdx}
                        className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <b className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                              {ev.n}
                            </b>
                            {ev.d && (
                              <span className="text-xs text-slate-400 font-mono">({ev.d})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 font-mono">
                              %{pct} خەرجکراوە
                            </span>
                            <button
                              type="button"
                              onClick={() => onDeleteEvent(evIdx)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>
                              خەرجکراو: <b className="font-mono text-slate-800 dark:text-slate-200">{fmt(itemsSpent)} IQD</b>
                            </span>
                            <span>
                              بودجە: <b className="font-mono text-slate-800 dark:text-slate-200">{fmt(ev.b)} IQD</b>
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-rose-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Event Checklist Items */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                            لیستی پێداویستی و تێچووەکان ({ev.it.length}):
                          </span>

                          {ev.it.map((item, itIdx) => (
                            <div
                              key={itIdx}
                              className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-xs"
                            >
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={!!item.ck}
                                  onChange={() => onToggleEventItem(evIdx, itIdx)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span className={item.ck ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                                  {item.n}
                                </span>
                              </label>

                              <div className="flex items-center gap-2">
                                <b className="font-mono text-slate-700 dark:text-slate-300">
                                  {fmt(item.pr)} IQD
                                </b>
                                <button
                                  type="button"
                                  onClick={() => onDeleteEventItem(evIdx, itIdx)}
                                  className="text-slate-400 hover:text-red-500 p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {/* Quick Add Item to Event */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={newEventItemName[evIdx] || ''}
                              onChange={e =>
                                setNewEventItemName(prev => ({ ...prev, [evIdx]: e.target.value }))
                              }
                              placeholder="ناوی پێداویستی نوێ..."
                              className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                            />
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              value={newEventItemPrice[evIdx] || ''}
                              onChange={e =>
                                setNewEventItemPrice(prev => ({ ...prev, [evIdx]: e.target.value }))
                              }
                              placeholder="نرخ (IQD)..."
                              className="w-28 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddEventItemSubmit(evIdx)}
                              className="py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                            >
                              زیادکردن
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  هیچ بۆنەیەک تۆمار نەکراوە. دەتوانیت بودجەی سەفەر یان ئاهەنگەکان لەم بەشە دیاری بکەیت.
                </div>
              )}
            </div>
          )}

          {/* 6. IMPORTANT FINANCIAL DATES APP */}
          {activeTool === 'dates' && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      بەروارە داراییە گرنگەکان
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      بیرهێنانەوە و ژماردنی ڕۆژەکان بۆ وادەی مووچە، کرێی خانوو، و پارەدانەکان
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddDate(!showAddDate)}
                  className="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>بەرواری نوێ</span>
                </button>
              </div>

              {/* Add Date Form */}
              {showAddDate && (
                <form
                  onSubmit={handleDateSubmit}
                  className="p-4 bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 rounded-2xl space-y-3"
                >
                  <div className="font-bold text-xs text-cyan-900 dark:text-cyan-200">
                    تۆمارکردنی بەرواری گرنگ
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        ناونیشانی بەروار:
                      </label>
                      <input
                        type="text"
                        required
                        value={dtName}
                        onChange={e => setDtName(e.target.value)}
                        placeholder="وەک: دابەشکردنی مووچە، کرێی دوکان..."
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        بەروار:
                      </label>
                      <input
                        type="date"
                        required
                        value={dtDate}
                        onChange={e => setDtDate(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                        چەند ڕۆژ پێشتر ئاگادارم بکەرەوە؟:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={dtRemindDays}
                        onChange={e => setDtRemindDays(e.target.value)}
                        className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dtYearly}
                        onChange={e => setDtYearly(e.target.checked)}
                        className="rounded text-cyan-600"
                      />
                      <span>ساڵانە دووبارە دەبێتەوە</span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddDate(false)}
                        className="py-1.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300"
                      >
                        پاشگەزبوونەوە
                      </button>
                      <button
                        type="submit"
                        className="py-1.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold"
                      >
                        تۆمارکردن
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Dates List */}
              {dates.length > 0 ? (
                <div className="space-y-2.5">
                  {dates.map((dt, dtIdx) => {
                    const daysDiff = getDaysDifference(dt.d);
                    const isPassed = daysDiff < 0;
                    const isToday = daysDiff === 0;

                    return (
                      <div
                        key={dtIdx}
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/70 text-cyan-700 dark:text-cyan-300 flex flex-col items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold">{dt.d.slice(5, 7)} مانگی</span>
                            <span className="text-xs font-mono font-black">{dt.d.slice(8, 10)}</span>
                          </div>
                          <div className="min-w-0">
                            <b className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate block">
                              {dt.n}
                            </b>
                            <span className="text-[10px] text-slate-400 font-mono">{dt.d}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
                              isToday
                                ? 'bg-emerald-500 text-white animate-pulse'
                                : isPassed
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                            }`}
                          >
                            {isToday ? 'ئەمڕۆیە!' : isPassed ? `${Math.abs(daysDiff)} ڕۆژ لەمەوبەر` : `${daysDiff} ڕۆژی ماوە`}
                          </span>

                          <button
                            type="button"
                            onClick={() => onDeleteDate(dtIdx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                  هیچ بەروارێکی گرنگ دیاری نەکراوە. بۆ نموونە: «کاتی پێدانی کرێی خانوو».
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
