import * as XLSX from 'xlsx';
import {
  MonthDoc,
  NamesConfig,
  SettingsConfig,
  SavingsGoal,
  RecurringExpense,
  DebtItem,
  ShopItem,
  KumalaItem,
  GoldItem,
  EventItem,
  ImportantDateItem,
  WealthData,
  ExpenseTx
} from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { val, fmt, sum, calcMonthTotals } from './calculations';

const PREFIX = 'b_';

export const getKeyName = (key: string, workspaceId?: string): string => {
  if (workspaceId && key !== 'settings' && key !== 'names') {
    return `a${workspaceId}_${key}`;
  }
  return key;
};

export const getItem = async <T>(key: string, workspaceId?: string): Promise<T | null> => {
  try {
    const raw = localStorage.getItem(PREFIX + getKeyName(key, workspaceId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading key ${key}:`, err);
    return null;
  }
};

export const setItem = async <T>(key: string, value: T, workspaceId?: string): Promise<void> => {
  try {
    localStorage.setItem(PREFIX + getKeyName(key, workspaceId), JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
};

export const createEmptyMonth = (): MonthDoc => ({
  inc: [],
  oi: 0,
  bud: Array(CATEGORIES.length).fill(0),
  tx: [],
  sv: []
});

export const loadMonthDoc = async (monthStr: string, workspaceId?: string): Promise<MonthDoc> => {
  const loaded = await getItem<MonthDoc>('m' + monthStr, workspaceId);
  const empty = createEmptyMonth();
  if (!loaded) return empty;
  return {
    inc: loaded.inc || [],
    oi: loaded.oi || 0,
    bud: loaded.bud && loaded.bud.length ? loaded.bud : empty.bud,
    tx: loaded.tx || [],
    sv: loaded.sv || [],
    closed: loaded.closed || 0,
    rec: loaded.rec || 0
  };
};

export const saveMonthDoc = async (monthStr: string, doc: MonthDoc, workspaceId?: string): Promise<void> => {
  await setItem('m' + monthStr, doc, workspaceId);
};

// PIN Hash with salt
export const sha256Hash = async (value: string): Promise<string> => {
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', enc.encode('xp:' + value));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Browser download helper
export const downloadFile = (filename: string, content: Blob | string, mimeType = 'application/json') => {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
};

// Export Full JSON Backup
export const exportBackupJSON = async (currentYear: string, workspaceId?: string, allData?: any) => {
  const months: MonthDoc[] = [];
  for (let m = 1; m <= 12; m++) {
    const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
    months.push(await loadMonthDoc(mStr, workspaceId));
  }

  const backupObject = {
    y: currentYear,
    m: months,
    g: allData?.goals || (await getItem<{ list: SavingsGoal[] }>('goals', workspaceId)) || { list: [] },
    r: allData?.recurring || (await getItem<{ list: RecurringExpense[] }>('rec', workspaceId)) || { list: [] },
    n: allData?.names || (await getItem<NamesConfig>('names', workspaceId)) || { mem: [], fx: 1500, gp: 0 },
    w: allData?.wealth || (await getItem<WealthData>('wealth', workspaceId)) || { as: [], fu: [] },
    pl: allData?.debts || (await getItem<{ l: DebtItem[] }>('ppl', workspaceId)) || { l: [] },
    sh: allData?.shopping || (await getItem<{ l: ShopItem[] }>('shop', workspaceId)) || { l: [] },
    km: allData?.kumala || (await getItem<{ l: KumalaItem[] }>('kom', workspaceId)) || { l: [] },
    gl: allData?.gold || (await getItem<{ l: GoldItem[] }>('gold', workspaceId)) || { l: [] },
    ev: allData?.events || (await getItem<{ l: EventItem[] }>('evt', workspaceId)) || { l: [] },
    dt: allData?.dates || (await getItem<{ l: ImportantDateItem[] }>('dts', workspaceId)) || { l: [] },
    timestamp: new Date().toISOString()
  };

  downloadFile(`expenses-backup-${currentYear}.json`, JSON.stringify(backupObject, null, 2));
};

// Safe UTF-8 Base64 Encoding
export const encodeBase64Utf8 = (str: string): string => {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
};

// Safe UTF-8 Base64 Decoding
export const decodeBase64Utf8 = (base64: string): string => {
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
};

// Complete Cloud Backup Payload
export const getCompleteCloudBackup = async (currentYear: string, workspaceId?: string, allData?: any) => {
  const months: Record<string, MonthDoc> = {};
  for (let m = 1; m <= 12; m++) {
    const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
    months[mStr] = await loadMonthDoc(mStr, workspaceId);
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes('_m20')) {
        const match = k.match(/m(\d{4}-\d{2})/);
        if (match && match[1] && !months[match[1]]) {
          months[match[1]] = await loadMonthDoc(match[1], workspaceId);
        }
      }
    }
  } catch {
    // Ignore storage scan issues
  }

  return {
    app: 'ExpenseMaster',
    version: '2.0',
    exportType: 'cloud_code',
    timestamp: new Date().toISOString(),
    y: currentYear,
    months,
    g: allData?.goals || (await getItem('goals', workspaceId)) || { list: [] },
    r: allData?.recurring || (await getItem('rec', workspaceId)) || { list: [] },
    n: allData?.names || (await getItem('names', workspaceId)) || { mem: [], fx: 1500, gp: 0 },
    w: allData?.wealth || (await getItem('wealth', workspaceId)) || { as: [], fu: [] },
    pl: allData?.debts || (await getItem('ppl', workspaceId)) || { l: [] },
    sh: allData?.shopping || (await getItem('shop', workspaceId)) || { l: [] },
    km: allData?.kumala || (await getItem('kom', workspaceId)) || { l: [] },
    gl: allData?.gold || (await getItem('gold', workspaceId)) || { l: [] },
    ev: allData?.events || (await getItem('evt', workspaceId)) || { l: [] },
    dt: allData?.dates || (await getItem('dts', workspaceId)) || { l: [] },
    settings: (await getItem('settings')) || {}
  };
};

// Generate Cloud Code Strings (for direct copy/paste or TS seed code)
export const generateCloudCodeString = async (currentYear: string, workspaceId?: string, allData?: any) => {
  const backup = await getCompleteCloudBackup(currentYear, workspaceId, allData);
  const jsonStr = JSON.stringify(backup, null, 2);
  const base64Str = encodeBase64Utf8(JSON.stringify(backup));
  const cloudCode = `XP_CLOUD_v2:${base64Str}`;
  const tsCode = `// ExpenseMaster - Private Cloud State & Seed Data
// Generated: ${new Date().toISOString()}
export const CLOUD_FINANCIAL_DATA = ${jsonStr} as const;

export default CLOUD_FINANCIAL_DATA;
`;
  return { cloudCode, tsCode, jsonStr, backup };
};

// Restore from Cloud Code String (XP_CLOUD_v2:..., base64, or JSON)
export const restoreFromCloudCodeString = async (
  inputStr: string,
  workspaceId?: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const cleanStr = inputStr.trim();
    if (!cleanStr) return { success: false, message: 'کۆدەکە بەتاڵە، تکایە کۆدێکی دروست دابنێ' };

    let dataObj: any = null;

    if (cleanStr.startsWith('XP_CLOUD_v2:')) {
      const b64 = cleanStr.slice('XP_CLOUD_v2:'.length).trim();
      const decodedJson = decodeBase64Utf8(b64);
      dataObj = JSON.parse(decodedJson);
    } else if (cleanStr.startsWith('{') || cleanStr.startsWith('[')) {
      dataObj = JSON.parse(cleanStr);
    } else {
      try {
        const decoded = decodeBase64Utf8(cleanStr);
        dataObj = JSON.parse(decoded);
      } catch {
        return { success: false, message: 'فۆرماتی کۆدەکە نادروستە یان تێکچووە' };
      }
    }

    if (!dataObj || typeof dataObj !== 'object') {
      return { success: false, message: 'هیچ داتایەکی گونجاو لەناو کۆدەکەدا نەدۆزرایەوە' };
    }

    // Save months
    if (dataObj.months && typeof dataObj.months === 'object') {
      for (const [mStr, doc] of Object.entries(dataObj.months)) {
        await saveMonthDoc(mStr, doc as MonthDoc, workspaceId);
      }
    } else if (Array.isArray(dataObj.m) && dataObj.y) {
      for (let i = 0; i < dataObj.m.length; i++) {
        const mStr = `${dataObj.y}-${String(i + 1).padStart(2, '0')}`;
        await saveMonthDoc(mStr, dataObj.m[i], workspaceId);
      }
    }

    if (dataObj.g) await setItem('goals', dataObj.g, workspaceId);
    if (dataObj.r) await setItem('rec', dataObj.r, workspaceId);
    if (dataObj.n) await setItem('names', dataObj.n, workspaceId);
    if (dataObj.w) await setItem('wealth', dataObj.w, workspaceId);
    if (dataObj.pl) await setItem('ppl', dataObj.pl, workspaceId);
    if (dataObj.sh) await setItem('shop', dataObj.sh, workspaceId);
    if (dataObj.km) await setItem('kom', dataObj.km, workspaceId);
    if (dataObj.gl) await setItem('gold', dataObj.gl, workspaceId);
    if (dataObj.ev) await setItem('evt', dataObj.ev, workspaceId);
    if (dataObj.dt) await setItem('dts', dataObj.dt, workspaceId);
    if (dataObj.settings) await setItem('settings', dataObj.settings);

    return {
      success: true,
      message: 'داتاکانت لە ڕێگەی کۆدی کڵاودەوە بە سەرکەوتوویی گەڕێنرانەوە!',
      data: dataObj
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'هەڵەیەک ڕوویدا لە کاتی هاوردەکردنی کۆدەکە' };
  }
};

// Export CSV for Year
export const exportYearCSV = async (currentYear: string, workspaceId?: string, langIndex = 0) => {
  const q = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
  let csv = '\ufeffDate,Category,Amount,Currency,IQD Equivalent,Note\n';

  for (let m = 1; m <= 12; m++) {
    const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
    const doc = await loadMonthDoc(mStr, workspaceId);
    (doc.tx || []).forEach(tx => {
      const catName = getCategoryName(tx.c, langIndex) || 'Other';
      const iqdVal = Math.round(val(tx));
      csv += `${tx.d},${q(catName)},${tx.a},${tx.cu === 'U' ? 'USD' : 'IQD'},${iqdVal},${q(tx.n || '')}\n`;
    });
  }

  downloadFile(`expenses-${currentYear}.csv`, csv, 'text/csv;charset=utf-8;');
};

// Export Excel XLSX via SheetJS
export const exportExcelWorkbook = async (params: {
  currentMonth: string;
  isYearly: boolean;
  isIncomeLocked: boolean;
  workspaceId?: string;
  langIndex: number;
  monthNames: string[];
  members: { n: string }[];
  defaultRate: number;
}) => {
  const {
    currentMonth,
    isYearly,
    isIncomeLocked,
    workspaceId,
    langIndex,
    monthNames,
    members,
    defaultRate
  } = params;

  const yearStr = currentMonth.slice(0, 4);
  const docs: { label: string; doc: MonthDoc }[] = [];

  if (isYearly) {
    for (let m = 1; m <= 12; m++) {
      const mStr = `${yearStr}-${String(m).padStart(2, '0')}`;
      docs.push({
        label: monthNames[m - 1] || mStr,
        doc: await loadMonthDoc(mStr, workspaceId)
      });
    }
  } else {
    docs.push({
      label: currentMonth,
      doc: await loadMonthDoc(currentMonth, workspaceId)
    });
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Monthly Overview
  const sheet1Data: (string | number)[][] = [
    [
      'Period',
      ...(isIncomeLocked ? [] : ['Income (IQD)']),
      'Expenses (IQD)',
      'Savings (IQD)',
      ...(isIncomeLocked ? [] : ['Remaining (IQD)', 'Savings Rate (%)'])
    ]
  ];

  docs.forEach(({ label, doc }) => {
    const totals = calcMonthTotals(doc, defaultRate);
    sheet1Data.push([
      label,
      ...(isIncomeLocked ? [] : [Math.round(totals.inc)]),
      Math.round(totals.exp),
      Math.round(totals.sv),
      ...(isIncomeLocked ? [] : [Math.round(totals.rem), Math.round(totals.savingsRate * 100)])
    ]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Data), 'Overview');

  // Sheet 2: Expenses Log
  const sheet2Data: (string | number)[][] = [
    ['Date', 'Category', 'Amount', 'Currency', 'Amount (IQD)', 'Person', 'Shared', 'Notes']
  ];
  docs.forEach(({ doc }) => {
    (doc.tx || []).forEach(tx => {
      const catName = getCategoryName(tx.c, langIndex) || 'Other';
      const personName = members[tx.w]?.n || '—';
      sheet2Data.push([
        tx.d,
        catName,
        tx.a,
        tx.cu === 'U' ? 'USD' : 'IQD',
        Math.round(val(tx, defaultRate)),
        personName,
        tx.s ? 'Yes' : 'No',
        tx.n || ''
      ]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet2Data), 'Expenses Log');

  // Sheet 3: Categories Summary
  const catTotals = Array(CATEGORIES.length).fill(0);
  docs.forEach(({ doc }) => {
    (doc.tx || []).forEach(tx => {
      if (tx.c >= 0 && tx.c < CATEGORIES.length) {
        catTotals[tx.c] += val(tx, defaultRate);
      }
    });
  });
  const totalAllExp = sum(catTotals) || 1;
  const sheet3Data: (string | number)[][] = [['Category', 'Total Spent (IQD)', 'Share (%)']];
  CATEGORIES.forEach((cat, idx) => {
    if (catTotals[idx] > 0) {
      sheet3Data.push([
        getCategoryName(cat, langIndex) || 'Other',
        Math.round(catTotals[idx]),
        +((catTotals[idx] / totalAllExp) * 100).toFixed(1)
      ]);
    }
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet3Data), 'Categories');

  // Write and download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const filename = `expenses-${isYearly ? yearStr : currentMonth}.xlsx`;
  downloadFile(filename, new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
};

// Export Standalone Single-File HTML Dashboard
export const exportStandaloneHTML = async (
  currentYear: string,
  workspaceId?: string,
  allData?: any
) => {
  const backup = await getCompleteCloudBackup(currentYear, workspaceId, allData);
  const dataJson = JSON.stringify(backup);

  const htmlDoc = `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ڕاپۆرت و سیستەمی دارایی - ${currentYear}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Noto Sans Arabic', 'Inter', system-ui, sans-serif; }
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; color: black !important; padding: 0 !important; }
    }
  </style>
</head>
<body class="bg-slate-100 text-slate-800 min-h-screen p-4 sm:p-6">
  <div class="max-w-5xl mx-auto space-y-5">
    <header class="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
      <div>
        <h1 class="text-xl font-black">داهاتوو - سیستەمی دارایی و خەرجییەکان (${currentYear})</h1>
        <p class="text-xs text-teal-200">فایلی خۆبژێوی HTML - تەواوی پاشەکەوت و خەرجییەکانت</p>
      </div>
      <button onclick="window.print()" class="no-print px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
        <span>چاپکردن</span>
      </button>
    </header>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3" id="metrics-grid"></div>

    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
      <h2 class="text-base font-bold text-teal-800 flex items-center gap-2">
        <svg class="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
        <span>ئامانجەکانی پاشەکەوت</span>
      </h2>
      <div id="goals-container" class="space-y-3"></div>
    </div>

    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
      <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
        <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
        <span>خەرجییەکانی مانگ</span>
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-xs text-start">
          <thead>
            <tr class="border-b border-slate-200 text-slate-400">
              <th class="py-2 text-start">بەروار</th>
              <th class="py-2 text-start">بڕی پارە</th>
              <th class="py-2 text-start">دراو</th>
              <th class="py-2 text-start">تێبینی</th>
            </tr>
          </thead>
          <tbody id="tx-tbody" class="divide-y divide-slate-100"></tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    const data = ${dataJson};
    function fmt(n) { return Number(n || 0).toLocaleString(); }
    
    // Compute totals
    let allTx = [];
    let incTotal = 0;
    let svTotal = 0;
    if (data.months) {
      Object.values(data.months).forEach(m => {
        if (m.tx) allTx = allTx.concat(m.tx);
        if (m.inc) incTotal += (m.inc || []).reduce((a,b)=>a+Number(b),0) + (Number(m.oi)||0);
        if (m.sv) svTotal += (m.sv || []).reduce((a,b)=>a+(Number(b.a)||0),0);
      });
    }
    const expTotal = allTx.reduce((a,t)=>a+(Number(t.a)||0),0);
    const goalsList = (data.g && data.g.list) ? data.g.list : [];
    const savedInGoals = goalsList.reduce((a,g)=>a+(Number(g.s)||0),0);

    document.getElementById('metrics-grid').innerHTML = \`
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <span class="text-xs text-slate-400 block mb-1">کۆی داهات</span>
        <b class="text-base font-bold text-emerald-600 font-mono">\${fmt(incTotal)} IQD</b>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <span class="text-xs text-slate-400 block mb-1">کۆی خەرجی</span>
        <b class="text-base font-bold text-red-500 font-mono">\${fmt(expTotal)} IQD</b>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <span class="text-xs text-slate-400 block mb-1">کۆی پاشەکەوت</span>
        <b class="text-base font-bold text-teal-600 font-mono">\${fmt(savedInGoals || svTotal)} IQD</b>
      </div>
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <span class="text-xs text-slate-400 block mb-1">باڵانس</span>
        <b class="text-base font-bold text-blue-600 font-mono">\${fmt(incTotal - expTotal)} IQD</b>
      </div>
    \`;

    // Goals
    const goalsEl = document.getElementById('goals-container');
    if (goalsList.length > 0) {
      goalsEl.innerHTML = goalsList.map(g => {
        const pct = Math.min(100, Math.round(((g.s||0)/(g.t||1))*100));
        return \`
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <div class="flex justify-between text-xs font-bold">
              <span>\${g.n}</span>
              <span class="text-teal-600 font-mono">%\${pct}</span>
            </div>
            <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div class="h-full bg-teal-500" style="width: \${pct}%"></div>
            </div>
            <div class="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>پاشەکەوت: \${fmt(g.s)} IQD</span>
              <span>ئامانج: \${fmt(g.t)} IQD</span>
            </div>
          </div>
        \`;
      }).join('');
    } else {
      goalsEl.innerHTML = '<p class="text-xs text-slate-400">هیچ ئامانجێک تۆمار نەکراوە</p>';
    }

    // Transactions
    const tbody = document.getElementById('tx-tbody');
    if (allTx.length > 0) {
      tbody.innerHTML = allTx.slice(0, 100).map(tx => \`
        <tr>
          <td class="py-2 font-mono">\${tx.d || '—'}</td>
          <td class="py-2 font-bold font-mono text-red-600">\${fmt(tx.a)}</td>
          <td class="py-2">\${tx.cu === 'U' ? 'USD' : 'IQD'}</td>
          <td class="py-2 text-slate-500">\${tx.n || '—'}</td>
        </tr>
      \`).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-400">هیچ خەرجییەک نەدۆزرایەوە</td></tr>';
    }
  </script>
</body>
</html>`;

  downloadFile(`expenses-report-${currentYear}.html`, htmlDoc, 'text/html;charset=utf-8');
};
