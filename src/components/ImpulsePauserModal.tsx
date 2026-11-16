import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  X,
  Plus,
  AlertCircle,
  TrendingDown,
  Gift,
  HelpCircle,
  Flame,
  ShoppingBag
} from 'lucide-react';
import { ExpenseTx, ImpulseItem } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { fmt } from '../utils/calculations';

interface ImpulsePauserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (tx: ExpenseTx, repeatMonthly: boolean) => void;
  defaultRate: number;
  langIndex: number;
  currentMonth: string;
}

export const ImpulsePauserModal: React.FC<ImpulsePauserModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  defaultRate,
  langIndex,
  currentMonth
}) => {
  const [items, setItems] = useState<ImpulseItem[]>(() => {
    try {
      const stored = localStorage.getItem('impulse_pauser_items');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [totalSaved, setTotalSaved] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('impulse_total_saved_iqd');
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'D' | 'U'>('D');
  const [catIndex, setCatIndex] = useState(11); // default to clothing or shopping
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    try {
      localStorage.setItem('impulse_pauser_items', JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('impulse_total_saved_iqd', String(totalSaved));
    } catch {}
  }, [totalSaved]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount || +amount <= 0) return;

    const newItem: ImpulseItem = {
      id: 'impulse_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      n: name.trim(),
      a: +amount,
      cu: currency,
      c: catIndex,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      status: 'pending'
    };

    setItems([newItem, ...items]);
    setName('');
    setAmount('');
    setShowAddForm(false);
  };

  const handleMarkSaved = (item: ImpulseItem) => {
    const iqdVal = item.a * (item.cu === 'U' ? defaultRate : 1);
    setTotalSaved(prev => prev + iqdVal);
    setItems(items.map(it => (it.id === item.id ? { ...it, status: 'saved' as const } : it)));
  };

  const handleBuyNow = (item: ImpulseItem) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const txDate = todayStr.startsWith(currentMonth) ? todayStr : `${currentMonth}-01`;
    const tx: ExpenseTx = {
      c: item.c,
      d: txDate,
      a: item.a,
      cu: item.cu,
      r: defaultRate,
      w: 0,
      s: 0,
      n: `${item.n} (دوای ٢٤ کاتژمێر تێڕامان)`
    };

    onAddExpense(tx, false);
    setItems(items.map(it => (it.id === item.id ? { ...it, status: 'bought' as const } : it)));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const pendingItems = items.filter(it => it.status === 'pending');
  const pastItems = items.filter(it => it.status !== 'pending');

  const formatRemainingTime = (expiresAt: number) => {
    const diffMs = expiresAt - nowTime;
    if (diffMs <= 0) return 'کات تەواو بوو (بڕیار بدە!)';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    return `${hours} کاتژمێر و ${mins} خولەک و ${secs} چرکە`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>سندووقی ئارامبوونەوە</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  یاسای ٢٤ کاتژمێر
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                ڕاگرتنی کڕینی هەڵەشەیی بۆ پاراستنی بوودجەی خێزان
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Psychological Insight Card */}
        <div className="my-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 border border-amber-500/20 text-slate-700 dark:text-slate-200 text-xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>یاسای ٢٤ کاتژمێری ئابووری دەروونی:</b> کاتێک شتێکی سەرنجڕاکێش بەڵام نەپلانکراو دەبینیت، بڕیاری کڕینەکەی ٢٤ کاتژمێر دوابخە. زیاتر لە <b>٨٠٪ی کات</b> دوای ٢٤ کاتژمێر ئەو هەستە دەروونییە دادەمرکێتەوە و پێت پێویست نابێت!
            </p>
          </div>

          {totalSaved > 0 && (
            <div className="mt-3 pt-2.5 border-t border-amber-500/20 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                کۆی پارەی ڕزگارکراو لە کڕینی هەڵەشەیی:
              </span>
              <b className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {fmt(totalSaved)} د.ع 🎉
              </b>
            </div>
          )}
        </div>

        {/* Actions bar: Add New Impulse Pause */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 px-4 mb-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ شتێکم بەدڵ بووە (پشوودان بۆ ٢٤ کاتژمێر)</span>
          </button>
        ) : (
          <form onSubmit={handleAddItem} className="p-4 mb-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                تۆمارکردنی کاڵایەکی سەرنجڕاکێش بۆ چاوەڕوانی
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                ناوی کاڵا یان شتەکە
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="بۆ نموونە: کاتژمێری ئەلیکترۆنی، جلی مارکە، ئامێر..."
                className="w-full py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  نرخەکەی
                </label>
                <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full py-2 px-3 text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as 'D' | 'U')}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2 border-s border-slate-200 dark:border-slate-700 focus:outline-none"
                  >
                    <option value="D">د.ع</option>
                    <option value="U">$</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  پۆل
                </label>
                <select
                  value={catIndex}
                  onChange={e => setCatIndex(+e.target.value)}
                  className="w-full py-2 px-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {getCategoryName(cat, langIndex)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition shadow-2xs cursor-pointer"
            >
              دەستپێکردنی مۆڵەتی ٢٤ کاتژمێری ئارامبوونەوە ⏳
            </button>
          </form>
        )}

        {/* List of Pending Items */}
        <div className="space-y-3 max-h-[340px] overflow-y-auto no-scrollbar">
          {pendingItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">هیچ کاڵایەکی هەڵەشەیی لە چاوەڕوانیدا نییە.</p>
              <p className="text-[11px] mt-1 text-slate-500">
                هەرکات لە بازاڕ یان ئۆنلاین چاوت بە شتێکی سەرنجڕاکێش کەوت، لێرە بیخە ڕاگرتنەوە.
              </p>
            </div>
          ) : (
            pendingItems.map(item => {
              const isExpired = item.expiresAt <= nowTime;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-2.5 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.n}
                      </h4>
                      <span className="text-[10px] text-slate-400 block">
                        {getCategoryName(item.c, langIndex)}
                      </span>
                    </div>

                    <div className="text-end">
                      <b className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {fmt(item.a)} {item.cu === 'U' ? '$' : 'د.ع'}
                      </b>
                      {item.cu === 'U' && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ≈ {fmt(item.a * defaultRate)} د.ع
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Countdown Timer Badge */}
                  <div className={`py-1.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    isExpired
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{isExpired ? '٢٤ کاتژمێر تەواو بوو!' : 'کاتی ماوە بۆ بیرکردنەوە:'}</span>
                    </span>
                    <span className="font-mono text-[11px] font-black">
                      {formatRemainingTime(item.expiresAt)}
                    </span>
                  </div>

                  {/* Decision Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleMarkSaved(item)}
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>پێویستم پێی نییە! (پاشەکەوتکرا 🎉)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBuyNow(item)}
                      className="py-1.5 px-3 bg-slate-200 dark:bg-slate-750 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>هێشتا پێویستمە (کڕین)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {pendingItems.length} کاڵا لە چاوەڕوانیدایە
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold cursor-pointer transition"
          >
            داخستن
          </button>
        </div>
      </div>
    </div>
  );
};
