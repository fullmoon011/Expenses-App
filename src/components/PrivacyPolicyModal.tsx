import React from 'react';
import { ShieldCheck, X, Lock, Cloud, Smartphone } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                سیاسەتی پاراستنی نهێنی (Privacy Policy)
              </h3>
              <span className="text-[11px] text-slate-400">
                داهاتوو · Dahatu Family Finance
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

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>١. پاراستنی زانیارییە داراییەکان</span>
            </div>
            <p>
              هەموو زانیارییە داراییەکانت (خەرجی، داهات، بودجە، قەرز، و پاشەکەوت) بە شێوەی سەرەکی لەسەر مۆبایلەکەی خۆت (Offline-First) هەڵدەگیرێن و هیچ لایەنێکی سێیەم دەستی پێیان ناگات.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cloud className="w-4 h-4 text-teal-600" />
              <span>٢. پاشەکەوتی هەوری و هاوبەشکردنی خێزان</span>
            </div>
            <p>
              کاتێک بە هەژماری گووگڵ دەچیتە ژوورەوە، زانیارییەکانت بە شێوەی پارێزراو لە **Google Firebase** پاشەکەوت دەبن و تەنها خۆت یان ئەو ئەندامەی خێزانەکەت کە کۆدی هاوبەشکردنی پێدەدەیت دەتوانن بیانبینن.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-teal-600" />
              <span>٣. مۆڵەتەکانی مۆبایل (Permissions)</span>
            </div>
            <p>
              کامێرا تەنها بۆ سکانی وەسڵەکان بەکاردێت و مایکرۆفۆن تەنها بۆ تۆمارکردنی خەرجی بە دەنگ بەکاردێت. هیچ وێنە یان دەنگێک بە بێ ڕەزامەندی تۆ پاشەکەوت ناکرێت.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-md transition cursor-pointer"
        >
          تێگەیشتم
        </button>
      </div>
    </div>
  );
};
