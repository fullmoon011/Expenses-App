import React, { useState, useRef } from 'react';
import {
  X,
  Plus,
  Repeat,
  Camera,
  Calendar,
  Sparkles,
  ScanLine,
  AlertTriangle,
  Zap,
  Wifi,
  Home,
  Droplets,
  Flame,
  Smartphone,
  Mic
} from 'lucide-react';
import { ExpenseTx, MonthDoc, NamesConfig, CurrencyType } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { GLOBAL_CURRENCIES } from '../utils/currencies';
import { fmt, val } from '../utils/calculations';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  langIndex: number;
  t: (key: string) => string;
  onAddExpense: (tx: ExpenseTx, repeatMonthly: boolean, dueDay?: number) => void;
  onEditExpense?: (index: number, tx: ExpenseTx) => void;
  editingIndex?: number | null;
  initialTx?: ExpenseTx | null;
  defaultRepeat?: boolean;
  defaultCategory?: number;
  onOpenVoice?: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  doc,
  names,
  langIndex,
  t,
  onAddExpense,
  onEditExpense,
  editingIndex = null,
  initialTx = null,
  defaultRepeat = false,
  defaultCategory = 6,
  onOpenVoice
}) => {
  const [catIndex, setCatIndex] = useState<number>(initialTx ? initialTx.c : defaultCategory);
  const [amount, setAmount] = useState<string>(initialTx ? String(initialTx.a) : '');
  const [date, setDate] = useState<string>(
    initialTx?.d ||
    (new Date().toISOString().slice(0, 10).startsWith(currentMonth)
      ? new Date().toISOString().slice(0, 10)
      : `${currentMonth}-01`)
  );
  const [currency, setCurrency] = useState<CurrencyType>(initialTx?.cu || 'D');
  const [personIndex, setPersonIndex] = useState<number>(initialTx ? initialTx.w : 0);
  const [isShared, setIsShared] = useState<boolean>(initialTx ? Boolean(initialTx.s) : false);
  const [note, setNote] = useState<string>(initialTx?.n || '');
  const [repeatMonthly, setRepeatMonthly] = useState<boolean>(defaultRepeat);
  const [dueDay, setDueDay] = useState<string>('1');
  const [photoData, setPhotoData] = useState<string>(initialTx?.ph || '');

  React.useEffect(() => {
    if (isOpen) {
      if (initialTx) {
        setCatIndex(initialTx.c);
        setAmount(String(initialTx.a));
        setDate(initialTx.d);
        setCurrency(initialTx.cu);
        setPersonIndex(initialTx.w);
        setIsShared(Boolean(initialTx.s));
        setNote(initialTx.n || '');
        setPhotoData(initialTx.ph || '');
        setRepeatMonthly(false);
      } else {
        setCatIndex(defaultCategory);
        setAmount('');
        const todayStr = new Date().toISOString().slice(0, 10);
        setDate(todayStr.startsWith(currentMonth) ? todayStr : `${currentMonth}-01`);
        setCurrency('D');
        setPersonIndex(0);
        setIsShared(false);
        setNote('');
        setPhotoData('');
        setRepeatMonthly(defaultRepeat);
      }
    }
  }, [isOpen, initialTx, defaultCategory, defaultRepeat, currentMonth]);

  // AI states
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const defaultRate = names.fx || 1500;
  const members = names.mem || [{ n: 'Person 1', e: 'user' }];
  const activeMemberIndices = members.map((_, i) => i).filter(i => !members[i]?.x);

  // Quick Bill Presets
  const billPresets = [
    { cat: 1, icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
    { cat: 4, icon: <Wifi className="w-3.5 h-3.5 text-blue-500" /> },
    { cat: 5, icon: <Smartphone className="w-3.5 h-3.5 text-indigo-500" /> },
    { cat: 0, icon: <Home className="w-3.5 h-3.5 text-emerald-500" /> },
    { cat: 2, icon: <Droplets className="w-3.5 h-3.5 text-cyan-500" /> },
    { cat: 3, icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
  ];

  const handleSelectBillPreset = (presetCat: number, label: string) => {
    setCatIndex(presetCat);
    setRepeatMonthly(true);
    if (!note) setNote(getCategoryName(presetCat, langIndex));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || +amount <= 0 || doc.closed) return;

    const meta = GLOBAL_CURRENCIES.find((c) => c.code === currency);
    const effectiveRate =
      currency === 'D'
        ? 1
        : currency === 'U'
        ? defaultRate
        : names.fxRates?.[currency] || meta?.defaultRateInIqd || defaultRate;

    const tx: ExpenseTx = {
      c: catIndex,
      d: date,
      a: +amount,
      cu: currency,
      r: effectiveRate,
      w: personIndex,
      s: isShared ? 1 : 0,
      ph: photoData,
      n: note.trim()
    };

    if (editingIndex !== null && editingIndex !== undefined && onEditExpense) {
      onEditExpense(editingIndex, tx);
    } else {
      onAddExpense(tx, repeatMonthly, dueDay ? +dueDay : 1);
    }
    onClose();
  };

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
            setAmount(String(data.total));
            if (data.currency === 'USD') setCurrency('U');
            else setCurrency('D');

            if (data.category >= 0 && data.category < CATEGORIES.length) {
              setCatIndex(data.category);
            }
            if (data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
              setDate(data.date);
            }
            const notes = [data.merchant, data.note].filter(Boolean).join(' - ');
            setNote(notes);
            setPhotoData(base64);
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150 pb-[max(20px,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Indicator Bar */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mb-3 sm:hidden" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-750 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {editingIndex !== null ? 'دەستکاریکردنی خەرجی' : t('newx')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('app')} · {currentMonth}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOpenVoice && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVoice();
                }}
                className="py-1 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="تۆماری دەنگی"
              >
                <Mic className="w-3.5 h-3.5 text-emerald-100" />
                <span>دەنگی</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Bill Presets */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
            {t('recbill_title')}
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {billPresets.map((bp) => {
              const catName = getCategoryName(bp.cat, langIndex);
              return (
                <button
                  key={bp.cat}
                  type="button"
                  onClick={() => handleSelectBillPreset(bp.cat, catName)}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border cursor-pointer ${
                    catIndex === bp.cat
                      ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {bp.icon}
                  <span>{catName.split(' / ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Amount & Currency */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              {t('amt')} *
            </label>
            <div className="flex rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500">
              <input
                type="number"
                step="any"
                min="0"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full py-3 px-3.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-black text-lg focus:outline-none"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm px-3.5 border-s border-slate-200 dark:border-slate-700 focus:outline-none cursor-pointer"
              >
                {GLOBAL_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} ({c.iso})
                  </option>
                ))}
              </select>
            </div>

            {/* Realistic Banknote Chips */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar py-0.5">
              {currency === 'D' ? (
                [
                  { val: 1000, label: '١,٠٠٠', color: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
                  { val: 5000, label: '٥,٠٠٠', color: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
                  { val: 10000, label: '١٠,٠٠٠', color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
                  { val: 25000, label: '٢٥,٠٠٠', color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
                  { val: 50000, label: '٥٠,٠٠٠', color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
                ].map((chip) => (
                  <button
                    key={chip.val}
                    type="button"
                    onClick={() => {
                      const curr = parseFloat(amount) || 0;
                      setAmount(String(curr + chip.val));
                    }}
                    className={`py-1 px-2.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all shadow-2xs active:scale-95 cursor-pointer ${chip.color}`}
                  >
                    + {chip.label}
                  </button>
                ))
              ) : (
                [5, 10, 20, 50, 100].map((chipVal) => (
                  <button
                    key={chipVal}
                    type="button"
                    onClick={() => {
                      const curr = parseFloat(amount) || 0;
                      setAmount(String(curr + chipVal));
                    }}
                    className="py-1 px-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold whitespace-nowrap transition active:scale-95 cursor-pointer"
                  >
                    + ${chipVal}
                  </button>
                ))
              )}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="py-1 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 text-slate-500 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                  title="سڕینەوە"
                >
                  سڕینەوە (C)
                </button>
              )}
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {t('cat')}
              </label>
              <select
                value={catIndex}
                onChange={(e) => setCatIndex(+e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {getCategoryName(cat, langIndex)}
                  </option>
                ))}
              </select>

              {/* Quick frequent categories */}
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar py-0.5">
                {[6, 7, 8, 9, 10].map((cId) => (
                  <button
                    key={cId}
                    type="button"
                    onClick={() => setCatIndex(cId)}
                    className={`py-0.5 px-2 rounded-lg text-[11px] font-medium whitespace-nowrap transition border ${
                      catIndex === cId
                        ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {getCategoryName(cId, langIndex).split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                {t('due')}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Note / Vendor */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              {t('desc')}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('note_placeholder')}
              className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
            />
          </div>

          {/* Person Selector (if > 1) */}
          {activeMemberIndices.length > 1 && (
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  {t('byp')}
                </label>
                <select
                  value={personIndex}
                  onChange={(e) => setPersonIndex(+e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  {members.map((m, idx) =>
                    !m.x ? (
                      <option key={idx} value={idx}>
                        {m.n}
                      </option>
                    ) : null
                  )}
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 pt-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="rounded-sm text-teal-600"
                />
                <span>{t('shr')}</span>
              </label>
            </div>
          )}

          {/* RECURRING EXPENSE TOGGLE CONTAINER */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              repeatMonthly
                ? 'bg-teal-50/80 dark:bg-teal-950/50 border-teal-400/80 dark:border-teal-700'
                : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    repeatMonthly
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 block">
                    {t('recbill_title')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block max-w-xs">
                    {t('recbill_desc')}
                  </span>
                </div>
              </div>

              {/* iOS style toggle switch */}
              <button
                type="button"
                role="switch"
                aria-checked={repeatMonthly}
                onClick={() => setRepeatMonthly(!repeatMonthly)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  repeatMonthly ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    repeatMonthly ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* When toggled ON: Due day selector & quick chips */}
            {repeatMonthly && (
              <div className="mt-3.5 pt-3 border-t border-teal-200 dark:border-teal-800/60 space-y-2 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>{t('recbill_day')}</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      placeholder="1"
                      className="w-16 py-1 px-2 text-center text-xs font-bold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">{t('days')}</span>
                  </div>
                </div>

                {/* Quick days chips */}
                <div className="flex items-center gap-1 text-[11px] overflow-x-auto py-0.5 no-scrollbar">
                  <span className="text-slate-400 shrink-0">{t('recbill_quickdays')}</span>
                  {[1, 5, 10, 15, 20, 25, 28].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDueDay(String(d))}
                      className={`py-0.5 px-2 rounded-md font-semibold transition ${
                        dueDay === String(d)
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-750">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {t('rst')}
            </button>
            <button
              type="submit"
              disabled={!amount || +amount <= 0}
              className="py-2.5 px-6 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{editingIndex !== null ? 'پاشەکەوتکردن' : t('add')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
