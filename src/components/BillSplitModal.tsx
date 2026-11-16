import React, { useState } from 'react';
import { Users, X, Check, Calculator } from 'lucide-react';
import { ExpenseTx, CurrencyType } from '../types';
import { GLOBAL_CURRENCIES, getCurrencySymbol } from '../utils/currencies';
import { fmt } from '../utils/calculations';

interface BillSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (tx: ExpenseTx, repeatMonthly: boolean) => void;
  defaultRate: number;
  fxRates?: Record<string, number>;
  currentMonth: string;
}

export const BillSplitModal: React.FC<BillSplitModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  defaultRate,
  fxRates,
  currentMonth
}) => {
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyType>('D');
  const [peopleCount, setPeopleCount] = useState<number>(2);
  const [note, setNote] = useState<string>('');
  const [logMyShareOnly, setLogMyShareOnly] = useState<boolean>(true);

  if (!isOpen) return null;

  const numTotal = parseFloat(totalAmount) || 0;
  const perPerson = peopleCount > 0 ? numTotal / peopleCount : numTotal;
  const symbol = getCurrencySymbol(currency);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (numTotal <= 0) return;

    const meta = GLOBAL_CURRENCIES.find((c) => c.code === currency);
    const effectiveRate =
      currency === 'D'
        ? 1
        : currency === 'U'
        ? defaultRate
        : fxRates?.[currency] || meta?.defaultRateInIqd || defaultRate;

    const today = new Date().toISOString().slice(0, 10);
    const amountToLog = logMyShareOnly ? Math.round(perPerson * 100) / 100 : numTotal;

    const tx: ExpenseTx = {
      c: 10, // Dining / Outing
      d: today.startsWith(currentMonth) ? today : `${currentMonth}-01`,
      a: amountToLog,
      cu: currency,
      r: effectiveRate,
      w: 0,
      s: 1,
      n: `${note.trim() || 'خەرجی هاوبەش'} (دابەشکراو بەسەر ${peopleCount} کەس)`
    };

    onAddExpense(tx, false);
    setTotalAmount('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                دابەشکردنی خەرجی هاوبەش (Bill Split)
              </h3>
              <span className="text-[11px] text-slate-400">
                دابەشکردنی پسوولەی خواردنگە، گەشت، یان کڕینی هاوبەش
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              کۆی گشتی پسوولە
            </label>
            <div className="flex rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
              <input
                type="number"
                step="any"
                min="0"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0"
                className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-lg focus:outline-none font-mono"
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyType)}
                className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs px-3 border-s border-slate-200 dark:border-slate-600 focus:outline-none cursor-pointer"
              >
                {GLOBAL_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} ({c.iso})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              ژمارەی کەسەکان: <b className="text-indigo-600 dark:text-indigo-400 font-mono">{peopleCount} کەس</b>
            </label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5, 6, 8].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setPeopleCount(cnt)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                    peopleCount === cnt
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>

          {/* Live Per-Person Calculation */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
              <Calculator className="w-4 h-4 text-indigo-500" />
              <span>بەشی هەر کەسێک:</span>
            </div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono tabular-nums">
              {fmt(perPerson)} <span className="text-xs font-bold">{symbol}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              تێبینی (بۆ نموونە: نانی ئێوارە لەگەڵ هاوڕێیان)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ناوی شوێن یان بۆنە..."
              className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={logMyShareOnly}
              onChange={(e) => setLogMyShareOnly(e.target.checked)}
              className="rounded-sm text-indigo-600 focus:ring-indigo-500"
            />
            <span>تەنها بەشی خۆم ({fmt(perPerson)} {symbol}) وەک خەرجی تۆمار بکە</span>
          </label>

          <button
            type="submit"
            disabled={numTotal <= 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تۆمارکردنی خەرجی</span>
          </button>
        </form>
      </div>
    </div>
  );
};
