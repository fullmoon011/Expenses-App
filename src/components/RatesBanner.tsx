import React, { useState } from 'react';
import { AlertCircle, Check, Coins, X } from 'lucide-react';
import { NamesConfig } from '../types';

interface RatesBannerProps {
  names: NamesConfig;
  onUpdateRates: (fx: number, gp: number) => void;
  t: (key: string) => string;
}

export const RatesBanner: React.FC<RatesBannerProps> = ({ names, onUpdateRates, t }) => {
  const today = new Date().toISOString().slice(0, 10);
  const isStale = names.fxd !== today || (names.gp > 0 && names.gpd !== today);

  const [fxVal, setFxVal] = useState<number>(names.fx || 1500);
  const [gpVal, setGpVal] = useState<number>(names.gp || 0);
  const [dismissed, setDismissed] = useState(false);

  if (!isStale || dismissed) return null;

  const handleConfirm = () => {
    onUpdateRates(fxVal, gpVal);
  };

  return (
    <div className="bg-slate-900/90 dark:bg-slate-800/95 text-white rounded-2xl p-3 px-4 mb-4 shadow-sm border border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <span className="font-medium text-slate-200">
          {t('stale') || 'تکایە نرخی ئەمڕۆی دۆلار و زێڕ پشتڕاست بکەرەوە:'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/10 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-white/10">
          <span className="text-[11px] font-bold text-slate-400">$</span>
          <input
            type="number"
            value={fxVal || ''}
            onChange={(e) => setFxVal(+e.target.value)}
            placeholder="1500"
            className="w-16 text-xs font-mono font-bold text-white bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white/10 dark:bg-slate-900/80 px-2.5 py-1 rounded-xl border border-white/10">
          <Coins className="w-3 h-3 text-amber-400" />
          <input
            type="number"
            value={gpVal || ''}
            onChange={(e) => setGpVal(+e.target.value)}
            placeholder="Gold"
            className="w-20 text-xs font-mono font-bold text-white bg-transparent focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 transition cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{t('ok2')}</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          title="داخستن"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
