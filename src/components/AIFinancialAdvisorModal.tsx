import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  X,
  TrendingDown,
  ShieldCheck,
  ShoppingBag,
  MessageSquare,
  SearchCheck,
  Loader2
} from 'lucide-react';
import { MonthDoc, NamesConfig, DebtItem, SavingsGoal } from '../types';
import { calcMonthTotals } from '../utils/calculations';
import { CATEGORIES, getCategoryName } from '../constants/categories';

interface AIFinancialAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  debts: DebtItem[];
  goals: SavingsGoal[];
  langIndex: number;
}

interface AIInsightsResult {
  leaks?: { title: string; detail: string }[];
  debtPlan?: string;
  shoppingTip?: string;
}

export const AIFinancialAdvisorModal: React.FC<AIFinancialAdvisorModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  doc,
  names,
  debts,
  goals,
  langIndex
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsightsResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const defaultRate = names.fx || 1500;
  const totals = calcMonthTotals(doc, defaultRate);

  const buildSummaryData = () => {
    const topCategories = CATEGORIES.map((cat, idx) => ({
      name: getCategoryName(cat, langIndex),
      spent: totals.sp[idx] || 0,
      budget: doc.bud[idx] || 0,
    }))
      .filter((c) => c.spent > 0 || c.budget > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8);

    return {
      month: currentMonth,
      totalIncomeIQD: totals.inc,
      totalExpensesIQD: totals.exp,
      totalSavingsIQD: totals.sv,
      remainingBalanceIQD: totals.rem,
      topCategories,
      debtsCount: debts.length,
      totalDebtRemaining: debts.reduce((s, d) => s + Math.max(0, (d.a || 0) - (d.p || 0)), 0),
      goalsCount: goals.length,
      goalsProgress: goals.map((g) => ({ name: g.n, saved: g.s, target: g.t })),
    };
  };

  const handleAsk = async (qText?: string) => {
    const finalQ = (qText ?? question).trim();
    if (!finalQ) return;
    if (qText) setQuestion(qText);

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: finalQ,
          summaryData: buildSummaryData(),
          language: langIndex === 1 ? 'English' : langIndex === 2 ? 'Arabic' : 'Kurdish (Sorani)',
        }),
      });
      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      setAnswer(data.answer || '');
    } catch {
      setErrorMsg('نەتوانرا پەیوەندی بە ڕاوێژکاری زیرەکەوە بکرێت. تکایە دووبارە هەوڵبدەرەوە.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryData: buildSummaryData(),
          language: langIndex === 1 ? 'English' : langIndex === 2 ? 'Arabic' : 'Kurdish (Sorani)',
        }),
      });
      if (!res.ok) throw new Error('AI insights failed');
      const data = await res.json();
      setInsights(data);
    } catch {
      setErrorMsg('نەتوانرا شیکردنەوەی زیرەک ئەنجام بدرێت.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-150 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                ڕاوێژکاری دارایی زیرەک (AI Advisor)
              </h3>
              <span className="text-[11px] text-slate-400">
                شیکردنەوەی خەرجی، دزەکردنی پارە، و پلانی قەرز بە کوردی
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

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>پرسیار لە ڕاوێژکار</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('insights');
              if (!insights) handleGenerateInsights();
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'insights'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <SearchCheck className="w-3.5 h-3.5" />
            <span>دزەکردنی پارە و قەرز</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {activeTab === 'chat' ? (
          <div className="space-y-4">
            {/* Quick-Ask Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'ئەم مانگە چەندم خەرج کردووە و دۆخم چۆنە؟',
                'چۆن دەتوانم ئەم مانگە زیاتر پاشەکەوت بکەم؟',
                'باشترین ڕێگا بۆ دانەوەی قەرزەکانم چییە؟',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAsk(q)}
                  disabled={isLoading}
                  className="text-[11px] py-1.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 border border-teal-200/70 dark:border-teal-800/60 font-medium transition cursor-pointer text-start"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Question Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                placeholder="پرسیارەکەت بە کوردی بنووسە..."
                className="flex-1 py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="button"
                onClick={() => handleAsk()}
                disabled={isLoading || !question.trim()}
                className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* AI Answer Box */}
            {answer && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 to-indigo-50/60 dark:from-teal-950/30 dark:to-indigo-950/30 border border-teal-200/80 dark:border-teal-800/50 text-xs text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                {answer}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {isLoading && !insights ? (
              <div className="py-10 text-center space-y-2 text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" />
                <p>ژیری دەستکرد خەریکی شیکردنەوەی داتاکانتە...</p>
              </div>
            ) : insights ? (
              <>
                {/* Spending Leaks */}
                {insights.leaks && insights.leaks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-amber-500" />
                      <span>دۆزینەوەی دزەکردنی پارە (Spending Leaks)</span>
                    </h4>
                    {insights.leaks.map((leak, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-xs"
                      >
                        <div className="font-bold text-amber-900 dark:text-amber-200 mb-0.5">
                          {leak.title}
                        </div>
                        <div className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                          {leak.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Debt Payoff Optimizer */}
                {insights.debtPlan && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-xs space-y-1">
                    <div className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      <span>پلانی زیرەکی دانەوەی قەرزەکان</span>
                    </div>
                    <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300/90 leading-relaxed">
                      {insights.debtPlan}
                    </p>
                  </div>
                )}

                {/* Smart Shopping Tip */}
                {insights.shoppingTip && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 text-xs space-y-1">
                    <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                      <span>ئامۆژگاری زیرەکی کڕین</span>
                    </div>
                    <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                      {insights.shoppingTip}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGenerateInsights}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  {isLoading ? 'خەریکە نوێدەبێتەوە...' : 'شیکردنەوەی دووبارە'}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
