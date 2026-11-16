import React, { useState } from 'react';
import {
  X,
  Printer,
  Copy,
  Download,
  Check,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Scale,
  Users,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { MonthDoc, NamesConfig } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { LANGUAGES } from '../constants/translations';
import { fmt, val, sum, calcMonthTotals, calc503020 } from '../utils/calculations';

interface FinancialPDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  langIndex: number;
  monthNames: string[];
  t: (key: string) => string;
  workspaceName?: string;
  isLocked?: boolean;
}

export const FinancialPDFReportModal: React.FC<FinancialPDFReportModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  doc,
  names,
  langIndex,
  monthNames,
  t,
  workspaceName,
  isLocked = false
}) => {
  const [copied, setCopied] = useState(false);
  const [includeTransactions, setIncludeTransactions] = useState(true);

  if (!isOpen) return null;

  const currentLang = LANGUAGES[langIndex] || LANGUAGES[0];
  const defaultRate = names.fx || 1500;
  const totals = calcMonthTotals(doc, defaultRate);
  const ruleBreakdown = calc503020(totals);
  const members = names.mem || [{ n: 'Person 1', e: 'user' }];

  const [yStr, mStr] = currentMonth.split('-');
  const mIndex = parseInt(mStr, 10) - 1;
  const monthLabel = `${monthNames[mIndex] || currentMonth} ${yStr}`;
  const nowFormatted = new Date().toLocaleDateString(
    currentLang.code === 'ckb' ? 'ku-IQ' : currentLang.code,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }
  );

  const activeWsTitle = workspaceName || names.mn || t('wsm');

  // Calculate category breakdowns
  const categoryRows = CATEGORIES.map((cat, idx) => {
    const spent = totals.sp[idx] || 0;
    const budget = doc.bud[idx] || 0;
    const diff = budget > 0 ? budget - spent : 0;
    const pctOfExp = totals.exp > 0 ? Math.round((spent / totals.exp) * 100) : 0;
    return {
      cat,
      idx,
      spent,
      budget,
      diff,
      pctOfExp
    };
  }).filter(r => r.spent > 0 || r.budget > 0);

  // Spending per member
  const memberSpends = members.map((m, pIdx) => {
    const total = sum(
      (doc.tx || [])
        .filter(x => x.w === pIdx)
        .map(x => val(x, defaultRate))
    );
    const pct = totals.exp > 0 ? Math.round((total / totals.exp) * 100) : 0;
    return { name: m.n, total, pct, isDeleted: m.x };
  }).filter(m => !m.isDeleted && m.total > 0);

  // Generate plain text report
  const generateTextReport = () => {
    let text = `=====================================\n`;
    text += `📑 ${t('pdf_official_doc')}: ${monthLabel}\n`;
    text += `${t('wsm')}: ${activeWsTitle}\n`;
    text += `${t('pdf_issue_date')}: ${nowFormatted}\n`;
    text += `${t('pdf_fx_rate')}: $100 = ${fmt(defaultRate * 100)} IQD\n`;
    text += `=====================================\n\n`;

    text += `📊 ${t('pdf_summary_header')}:\n`;
    text += `• ${t('inc')}: ${isLocked ? '••••••' : fmt(totals.inc)} IQD\n`;
    text += `• ${t('exp')}: ${fmt(totals.exp)} IQD\n`;
    text += `• ${t('ns')}: ${fmt(totals.sv)} IQD\n`;
    text += `• ${t('rem')}: ${isLocked ? '••••••' : fmt(totals.rem)} IQD\n`;
    text += `• ${t('rate')}: ${isLocked ? '••%' : `${Math.round(totals.savingsRate * 100)}%`}\n\n`;

    text += `⚖️ ${t('pdf_rule_503020_title')}:\n`;
    text += `• ${t('pdf_rule_needs')}: ${fmt(ruleBreakdown.needs)} IQD (${ruleBreakdown.needsPct}%)\n`;
    text += `• ${t('pdf_rule_wants')}: ${fmt(ruleBreakdown.wants)} IQD (${ruleBreakdown.wantsPct}%)\n`;
    text += `• ${t('pdf_rule_savings')}: ${fmt(ruleBreakdown.savings)} IQD (${ruleBreakdown.savingsPct}%)\n\n`;

    text += `🏷️ ${t('pdf_cat_details')}:\n`;
    categoryRows.slice(0, 10).forEach(c => {
      text += `• ${getCategoryName(c.cat, langIndex)}: ${fmt(c.spent)} IQD (${c.pctOfExp}%)\n`;
    });

    if (includeTransactions && (doc.tx || []).length > 0) {
      text += `\n📝 ${t('pdf_transactions_title')} (${(doc.tx || []).length}):\n`;
      (doc.tx || []).forEach(tx => {
        const cName = getCategoryName(tx.c, langIndex) || t('exp');
        const pName = members[tx.w]?.n || '';
        text += `• [${tx.d}] ${cName}: ${fmt(tx.a)} ${tx.cu === 'U' ? '$' : 'IQD'} ${tx.n ? `(${tx.n})` : ''} - ${pName}\n`;
      });
    }

    text += `\n=====================================\n`;
    text += `${t('pdf_security_footer')}\n`;
    return text;
  };

  const handleCopyText = async () => {
    try {
      const text = generateTextReport();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    const isRtl = currentLang.dir === 'rtl';
    const reportHtml = `
<!DOCTYPE html>
<html lang="${currentLang.code}" dir="${currentLang.dir}">
<head>
  <meta charset="utf-8">
  <title>${t('pdf_report_month')} - ${monthLabel}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700;900&display=swap');
    body {
      font-family: 'Noto Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: ${currentLang.dir};
      text-align: ${isRtl ? 'right' : 'left'};
      padding: 30px;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      background: #ffffff;
      padding: 35px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      border-bottom: 3px solid #0d9488;
      padding-bottom: 20px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .title { font-size: 24px; font-weight: 900; color: #0f172a; margin: 0; }
    .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
    .meta-box { text-align: ${isRtl ? 'left' : 'right'}; font-size: 12px; color: #475569; }
    .cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 30px;
    }
    .card {
      background: #f1f5f9;
      padding: 15px;
      border-radius: 12px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .card-title { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px; }
    .card-val { font-size: 18px; font-weight: 900; color: #0f172a; }
    .card.income { background: #ecfdf5; border-color: #a7f3d0; }
    .card.income .card-val { color: #065f46; }
    .card.expense { background: #fff1f2; border-color: #fecdd3; }
    .card.expense .card-val { color: #9f1239; }
    .card.savings { background: #eff6ff; border-color: #bfdbfe; }
    .card.savings .card-val { color: #1e40af; }
    .section-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      ${isRtl ? 'border-right: 4px solid #0d9488; padding-right: 10px;' : 'border-left: 4px solid #0d9488; padding-left: 10px;'}
      margin: 25px 0 15px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 20px;
    }
    th {
      background: #f8fafc;
      padding: 10px;
      font-weight: 700;
      color: #334155;
      border-bottom: 2px solid #cbd5e1;
      text-align: ${isRtl ? 'right' : 'left'};
    }
    td {
      padding: 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) { background: #fafafa; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .badge-ok { background: #dcfce7; color: #15803d; }
    .badge-warn { background: #fee2e2; color: #b91c1c; }
    .footer {
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .container { box-shadow: none; border: none; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">${t('pdf_official_doc')}</h1>
        <div class="subtitle">${monthLabel} | ${t('wsm')}: ${activeWsTitle}</div>
      </div>
      <div class="meta-box">
        <div>${t('pdf_issue_date')}: ${nowFormatted}</div>
        <div>${t('pdf_fx_rate')}: $100 = ${fmt(defaultRate * 100)} IQD</div>
      </div>
    </div>

    <div class="cards">
      <div class="card income">
        <div class="card-title">${t('inc')}</div>
        <div class="card-val">${isLocked ? '••••••' : fmt(totals.inc)} IQD</div>
      </div>
      <div class="card expense">
        <div class="card-title">${t('exp')}</div>
        <div class="card-val">${fmt(totals.exp)} IQD</div>
      </div>
      <div class="card savings">
        <div class="card-title">${t('ns')}</div>
        <div class="card-val">${fmt(totals.sv)} IQD</div>
      </div>
      <div class="card">
        <div class="card-title">${t('rate')}</div>
        <div class="card-val">${isLocked ? '••%' : `${Math.round(totals.savingsRate * 100)}%`}</div>
      </div>
    </div>

    <div class="section-title">${t('pdf_cat_details')}</div>
    <table>
      <thead>
        <tr>
          <th>${t('pdf_cat_col_name')}</th>
          <th>${t('pdf_cat_col_budget')}</th>
          <th>${t('pdf_cat_col_spent')}</th>
          <th>${t('pdf_cat_col_diff')}</th>
          <th>${t('pdf_cat_col_share')}</th>
        </tr>
      </thead>
      <tbody>
        ${categoryRows.map(r => `
          <tr>
            <td><strong>${getCategoryName(r.cat, langIndex)}</strong></td>
            <td>${r.budget > 0 ? fmt(r.budget) + ' IQD' : t('pdf_not_set')}</td>
            <td><strong>${fmt(r.spent)} IQD</strong></td>
            <td>
              ${r.budget > 0 
                ? (r.diff >= 0 
                    ? `<span class="badge badge-ok">+${fmt(r.diff)} IQD ${t('pdf_surplus_badge')}</span>`
                    : `<span class="badge badge-warn">${fmt(Math.abs(r.diff))} IQD ${t('pdf_over_budget_badge')}</span>`)
                : '-'}
            </td>
            <td>${r.pctOfExp}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    ${memberSpends.length > 1 ? `
      <div class="section-title">${t('pdf_members_split')}</div>
      <table>
        <thead>
          <tr>
            <th>${t('mem')}</th>
            <th>${t('pdf_cat_col_spent')}</th>
            <th>${t('pdf_cat_col_share')}</th>
          </tr>
        </thead>
        <tbody>
          ${memberSpends.map(m => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${fmt(m.total)} IQD</td>
              <td>${m.pct}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <div class="footer">
      ${t('pdf_security_footer')}
    </div>
  </div>
</body>
</html>
    `;

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${currentMonth}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {t('pdf_modal_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {monthLabel} • {activeWsTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title={t('pdf_print_save')}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{t('pdf_print_save')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHTML}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title={t('pdf_download_html')}
            >
              <Download className="w-4 h-4" />
              <span className="hidden md:inline">{t('pdf_download_html')}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              title={t('pdf_copy_text')}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? t('copied') : t('pdf_copy_text')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Document Content */}
        <div id="printable-financial-statement" className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-8">
          {/* Document Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b-2 border-teal-600 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-xs uppercase tracking-wider">
                  {t('pdf_official_doc')}
                </span>
                <span className="text-xs text-slate-400">#REP-{currentMonth.replace('-', '')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">
                {t('pdf_report_month')}: {monthLabel}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('wsm')}: <b className="text-slate-700 dark:text-slate-300">{activeWsTitle}</b>
              </p>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-left bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div><span className="font-semibold text-slate-700 dark:text-slate-300">{t('pdf_issue_date')}:</span> {nowFormatted}</div>
              <div className="mt-1"><span className="font-semibold text-slate-700 dark:text-slate-300">{t('pdf_fx_rate')}:</span> $100 = {fmt(defaultRate * 100)} IQD</div>
              <div className="mt-1"><span className="font-semibold text-slate-700 dark:text-slate-300">{t('pdf_gold_mithqal')}:</span> {names.gp ? `${fmt(names.gp * 5)} IQD` : t('pdf_not_set')}</div>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                {t('inc')}
              </span>
              <b className="text-lg sm:2xl font-black text-emerald-800 dark:text-emerald-200 block truncate">
                {isLocked ? '••••••' : `${fmt(totals.inc)} IQD`}
              </b>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block mb-1">
                {t('exp')}
              </span>
              <b className="text-lg sm:2xl font-black text-rose-800 dark:text-rose-200 block truncate">
                {fmt(totals.exp)} IQD
              </b>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-1">
                {t('ns')}
              </span>
              <b className="text-lg sm:2xl font-black text-blue-800 dark:text-blue-200 block truncate">
                {fmt(totals.sv)} IQD
              </b>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-2xl p-4 text-center">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 block mb-1">
                {t('rate')}
              </span>
              <b className="text-lg sm:2xl font-black text-purple-800 dark:text-purple-200 block truncate">
                {isLocked ? '••%' : `${Math.round(totals.savingsRate * 100)}%`}
              </b>
            </div>
          </div>

          {/* 50/30/20 Rule Analysis Box */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-6">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>{t('pdf_rule_503020_title')}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between font-bold mb-1">
                  <span>{t('pdf_rule_needs')}</span>
                  <span className={ruleBreakdown.needsPct > 50 ? 'text-amber-600' : 'text-emerald-600'}>
                    {ruleBreakdown.needsPct}%
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono">{fmt(ruleBreakdown.needs)} IQD</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between font-bold mb-1">
                  <span>{t('pdf_rule_wants')}</span>
                  <span className={ruleBreakdown.wantsPct > 30 ? 'text-rose-600' : 'text-blue-600'}>
                    {ruleBreakdown.wantsPct}%
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono">{fmt(ruleBreakdown.wants)} IQD</div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between font-bold mb-1">
                  <span>{t('pdf_rule_savings')}</span>
                  <span className={ruleBreakdown.savingsPct >= 20 ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                    {ruleBreakdown.savingsPct}%
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono">{fmt(ruleBreakdown.savings)} IQD</div>
              </div>
            </div>
          </div>

          {/* Detailed Category Table */}
          <div className="mb-6">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center justify-between">
              <span>{t('pdf_cat_details')}</span>
              <span className="text-xs text-slate-400 font-normal">({categoryRows.length})</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3">#</th>
                    <th className="p-3">{t('pdf_cat_col_name')}</th>
                    <th className="p-3 text-left">{t('pdf_cat_col_budget')}</th>
                    <th className="p-3 text-left">{t('pdf_cat_col_spent')}</th>
                    <th className="p-3 text-left">{t('pdf_cat_col_diff')}</th>
                    <th className="p-3 text-center">{t('pdf_cat_col_share')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {categoryRows.map((r, i) => (
                    <tr key={r.idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {getCategoryName(r.cat, langIndex)}
                      </td>
                      <td className="p-3 text-left font-mono text-slate-600 dark:text-slate-400">
                        {r.budget > 0 ? `${fmt(r.budget)} IQD` : '-'}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900 dark:text-slate-100">
                        {fmt(r.spent)} IQD
                      </td>
                      <td className="p-3 text-left">
                        {r.budget > 0 ? (
                          r.diff >= 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                              +{fmt(r.diff)} IQD
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-mono">
                              {fmt(r.diff)} IQD
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">
                        {r.pctOfExp}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Member Spending Distribution */}
          {memberSpends.length > 1 && (
            <div className="mb-6">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                <span>{t('pdf_members_split')}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {memberSpends.map((m, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{m.name}</span>
                    <b className="text-sm font-black text-teal-700 dark:text-teal-400 block mt-1 font-mono">
                      {fmt(m.total)} IQD
                    </b>
                    <span className="text-[11px] text-slate-400 block">{m.pct}% {t('pdf_of_total_expense')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Transactions Log */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <span>{t('pdf_transactions_title')}</span>
              </h3>
              <label className="flex items-center gap-2 text-xs text-slate-500 print:hidden cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTransactions}
                  onChange={e => setIncludeTransactions(e.target.checked)}
                  className="rounded text-teal-600"
                />
                <span>{t('pdf_show_all_tx')}</span>
              </label>
            </div>

            {includeTransactions && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-2xl max-h-72 overflow-y-auto print:max-h-none">
                <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">{t('pdf_tx_day')}</th>
                      <th className="p-2.5">{t('pdf_cat_col_name')}</th>
                      <th className="p-2.5">{t('nt')}</th>
                      <th className="p-2.5">{t('pdf_tx_spender')}</th>
                      <th className="p-2.5 text-left">{t('pdf_cat_col_spent')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(doc.tx || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">{t('pdf_no_tx')}</td>
                      </tr>
                    ) : (
                      (doc.tx || []).map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-mono text-slate-500">{tx.d}</td>
                          <td className="p-2.5 font-bold">{getCategoryName(tx.c, langIndex)}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">{tx.n || '-'}</td>
                          <td className="p-2.5 text-slate-500">{members[tx.w]?.n || t('mem')}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-slate-800 dark:text-slate-100">
                            {fmt(tx.a)} {tx.cu === 'U' ? '$' : 'IQD'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Official Sign-off & Verification Footer */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>{t('pdf_security_footer')}</span>
            </div>
            <div className="font-mono text-[11px]">
              {t('pdf_signature')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
