import React, { useState, useEffect, useCallback } from 'react';
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
} from './types';
import { LANGUAGES, UI_STRINGS, MONTH_NAMES } from './constants/translations';
import { CATEGORIES } from './constants/categories';
import {
  getItem,
  setItem,
  loadMonthDoc,
  saveMonthDoc,
  exportBackupJSON,
  exportYearCSV,
  downloadFile
} from './utils/storage';
import { calcMonthTotals, shiftMonth, sum, val } from './utils/calculations';
import { Header } from './components/Header';
import { BottomNav, TabKey } from './components/BottomNav';
import { RatesBanner } from './components/RatesBanner';
import { DuesBanner } from './components/DuesBanner';
import { PinModal } from './components/PinModal';
import { ExpensesTab } from './components/ExpensesTab';
import { ReportsTab } from './components/ReportsTab';
import { WealthTab } from './components/WealthTab';
import { MoreTab } from './components/MoreTab';
import { SettingsTab } from './components/SettingsTab';
import { AddExpenseModal } from './components/AddExpenseModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { FinancialPDFReportModal } from './components/FinancialPDFReportModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { AIFinancialAdvisorModal } from './components/AIFinancialAdvisorModal';
import { AlertTriangle, BellRing, X } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { computeSmartNotifications, checkAndDispatchBudgetAlert, BudgetAlertResult } from './utils/notifications';
import { haptics } from './utils/haptics';

export default function App() {
  const currentMonthInitial = new Date().toISOString().slice(0, 7);
  const [currentMonth, setCurrentMonth] = useState<string>(currentMonthInitial);
  const [activeTab, setActiveTab] = useState<TabKey>('expenses');
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [showPinModal, setShowPinModal] = useState<boolean>(false);
  const [isGlobalAddExpenseOpen, setIsGlobalAddExpenseOpen] = useState<boolean>(false);
  const [cloudUser, setCloudUser] = useState<User | null>(null);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);
  const [activeBudgetAlert, setActiveBudgetAlert] = useState<BudgetAlertResult | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCloudUser(u);
    });
    return () => unsub();
  }, []);

  // Core application data state
  const [settings, setSettings] = useState<SettingsConfig>({
    l: 0,
    th: 'auto',
    ac: '#0f766e',
    acc: ''
  });

  const [names, setNames] = useState<NamesConfig>({
    mem: [
      { n: 'ئەحمەد (Ahmed)', e: 'user' },
      { n: 'سارا (Sara)', e: 'user-round' }
    ],
    fx: 1500,
    gp: 65000,
    fxd: new Date().toISOString().slice(0, 10),
    gpd: new Date().toISOString().slice(0, 10),
    lim: { p: 80, m: 'p', v: 80 }
  });

  const [monthDoc, setMonthDoc] = useState<MonthDoc>({
    inc: [1800000, 1200000],
    oi: 0,
    bud: Array(CATEGORIES.length).fill(0),
    tx: [],
    sv: []
  });

  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [shopping, setShopping] = useState<ShopItem[]>([]);
  const [kumala, setKumala] = useState<KumalaItem[]>([]);
  const [gold, setGold] = useState<GoldItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [dates, setDates] = useState<ImportantDateItem[]>([]);
  const [wealth, setWealth] = useState<WealthData>({ as: [], fu: [] });

  // Undo delete
  const [lastDeletedTx, setLastDeletedTx] = useState<ExpenseTx | null>(null);

  const activeWsId = settings.acc || '';

  // Translation helper
  const t = useCallback(
    (key: string): string => {
      const arr = UI_STRINGS[key];
      if (!arr) return key;
      const langIdx = settings.l !== undefined ? settings.l : 0;
      return arr[langIdx] || arr[2] || arr[0] || key;
    },
    [settings.l]
  );

  // Load everything from storage on mount or when workspace/month changes
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const s = await getItem<SettingsConfig>('settings');
      if (s && isMounted) setSettings(prev => ({ ...prev, ...s }));

      const n = await getItem<NamesConfig>('names');
      if (n && isMounted) {
        setNames(prev => ({
          ...prev,
          ...n,
          mem: n.mem && n.mem.length ? n.mem : prev.mem
        }));
      }

      const mDoc = await loadMonthDoc(currentMonth, activeWsId);
      // If fresh month, provide standard default budgets
      const isFreshBud = !mDoc.bud.some((b: number) => b > 0);
      if (isFreshBud) {
        const defaultBud: number[] = [...mDoc.bud];
        defaultBud[0] = 500000; // Rent
        defaultBud[1] = 120000; // Electricity & generator
        defaultBud[4] = 45000;  // Internet
        defaultBud[6] = 400000; // Groceries
        defaultBud[7] = 60000;  // Bread
        defaultBud[8] = 150000; // Meat
        defaultBud[9] = 100000; // Fruit & veg
        defaultBud[11] = 120000;// Fuel
        mDoc.bud = defaultBud;
        if (mDoc.inc.length === 0) {
          mDoc.inc = [1800000, 1200000];
        }
      }
      if (isMounted) setMonthDoc(mDoc);

      const g = await getItem<{ list: SavingsGoal[] }>('goals', activeWsId);
      if (g?.list && isMounted) setGoals(g.list);
      else if (isMounted && goals.length === 0) {
        setGoals([
          { n: 'یەدەگی فریاکەوتن (Emergency Fund)', t: 5000000, s: 1500000, dt: '2026-12', mt: 350000 },
          { n: 'خوێندن و پێداویستی (Education)', t: 1200000, s: 400000, mt: 100000 }
        ]);
      }

      const r = await getItem<{ list: RecurringExpense[] }>('rec', activeWsId);
      if (r?.list && isMounted) setRecurring(r.list);
      else if (isMounted && recurring.length === 0) {
        setRecurring([
          { c: 4, a: 45000, cu: 'D', w: 0, n: 'ئینتەرنێت Fastlink', dd: 1 },
          { c: 1, a: 85000, cu: 'D', w: 0, n: 'مۆلیدەی گەڕەک', dd: 5 }
        ]);
      }

      const pl = await getItem<{ l: DebtItem[] }>('ppl', activeWsId);
      if (pl?.l && isMounted) setDebts(pl.l);
      else if (isMounted && debts.length === 0) {
        setDebts([
          { n: 'کاک کاروان (Karwan)', k: 'b', a: 1500000, cu: 'D', p: 500000, m: 250000, due: '2026-11-01', rd: 5 },
          { n: 'ئامۆزا دانا (Dana)', k: 'l', a: 300, cu: 'U', p: 100, due: '2026-10-25', rd: 3 }
        ]);
      }

      const sh = await getItem<{ l: ShopItem[] }>('shop', activeWsId);
      if (sh?.l && isMounted) setShopping(sh.l);

      const km = await getItem<{ l: KumalaItem[] }>('kom', activeWsId);
      if (km?.l && isMounted) setKumala(km.l);
      else if (isMounted && kumala.length === 0) {
        setKumala([
          {
            n: 'کۆمەڵەی هاوڕێیان (Friends Kumala)',
            a: 200000,
            m: 10,
            s: '2026-05',
            t: 6,
            dd: 1,
            pd: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
            rc: 0
          }
        ]);
      }

      const gl = await getItem<{ l: GoldItem[] }>('gold', activeWsId);
      if (gl?.l && isMounted) setGold(gl.l);
      else if (isMounted && gold.length === 0) {
        setGold([
          { d: '2026-03-15', g: 15, k: 21, p: 58000, n: 'دەستبەند' }
        ]);
      }

      const ev = await getItem<{ l: EventItem[] }>('evt', activeWsId);
      if (ev?.l && isMounted) setEvents(ev.l);

      const dt = await getItem<{ l: ImportantDateItem[] }>('dts', activeWsId);
      if (dt?.l && isMounted) setDates(dt.l);
      else if (isMounted && dates.length === 0) {
        setDates([
          { n: 'بیمەی ئوتومبێل (Car Insurance)', d: '2026-11-20', rd: 14, y: 1 }
        ]);
      }

      const w = await getItem<WealthData>('wealth', activeWsId);
      if (w?.as && isMounted) setWealth(w);
      else if (isMounted && wealth.as.length === 0) {
        setWealth({
          as: [
            { n: 'کاشی ماڵەوە', k: 'i', v: 1200000 },
            { n: 'پاشەکەوتی دۆلار', k: 'u', v: 1500 }
          ],
          fu: [
            { n: 'بیمە و باجی ساڵانە', a: 600000 }
          ]
        });
      }
    })();

    return () => { isMounted = false; };
  }, [currentMonth, activeWsId]);

  // Apply Appearance, Theme & Direction
  useEffect(() => {
    const root = document.documentElement;
    const currentLang = LANGUAGES[settings.l ?? 0] || LANGUAGES[0];
    root.dir = currentLang.dir;
    root.lang = currentLang.code;

    // Helper for hex to RGB
    const hex = (settings.ac || '#0f766e').replace('#', '');
    let r = 15, g = 118, b = 110;
    if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16) || 15;
      g = parseInt(hex.substring(2, 4), 16) || 118;
      b = parseInt(hex.substring(4, 6), 16) || 110;
    } else if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) || 15;
      g = parseInt(hex[1] + hex[1], 16) || 118;
      b = parseInt(hex[2] + hex[2], 16) || 110;
    }
    const accent = settings.ac || '#0f766e';
    const hoverR = Math.max(0, Math.min(255, Math.floor(r * 0.85)));
    const hoverG = Math.max(0, Math.min(255, Math.floor(g * 0.85)));
    const hoverB = Math.max(0, Math.min(255, Math.floor(b * 0.85)));
    root.style.setProperty('--ac', accent);
    root.style.setProperty('--ac-hover', `rgb(${hoverR}, ${hoverG}, ${hoverB})`);
    root.style.setProperty('--ac-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--ac-soft', `rgba(${r}, ${g}, ${b}, 0.14)`);
    root.style.setProperty('--ac-glow', `rgba(${r}, ${g}, ${b}, 0.45)`);

    // Theme (dark / light / neon / oled / auto)
    root.classList.remove('dark', 'theme-neon', 'theme-oled');
    if (settings.th === 'neon') {
      root.classList.add('dark', 'theme-neon');
      root.dataset.theme = 'neon';
    } else if (settings.th === 'oled') {
      root.classList.add('dark', 'theme-oled');
      root.dataset.theme = 'oled';
    } else if (settings.th === 'dark') {
      root.classList.add('dark');
      root.dataset.theme = 'dark';
    } else if (settings.th === 'light') {
      root.dataset.theme = 'light';
    } else {
      root.removeAttribute('data-theme');
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }

    // Sync Haptics engine setting
    haptics.setEnabled(settings.haptics !== false);

    const ui = settings.ui || {};
    if (ui.fs) root.style.setProperty('--fs', `${ui.fs}px`);
    if (ui.r !== undefined) {
      root.style.setProperty('--r', `${ui.r}px`);
      root.style.setProperty('--ir', `${Math.min(ui.r, 14)}px`);
    }
    if (ui.d !== undefined) {
      root.style.setProperty('--cp', `${ui.d}px`);
    }
    if (ui.ff === 1) {
      root.style.setProperty('--ff', '"Noto Naskh Arabic", serif');
    } else {
      root.style.setProperty('--ff', '"Noto Sans Arabic", sans-serif');
    }
  }, [settings]);

  // Global convenience shortcut: press 'n' or '+' to quickly open Add Expense modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N' || e.key === '+') &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !showPinModal &&
        !isGlobalAddExpenseOpen
      ) {
        e.preventDefault();
        setIsGlobalAddExpenseOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinModal, isGlobalAddExpenseOpen]);

  // Auto-lock when tab becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isLocked) {
        setIsLocked(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLocked]);

  // Toggle Lock
  const handleToggleLock = () => {
    if (!isLocked) {
      setIsLocked(true);
      return;
    }
    // If PIN or Biometric is set, ask for it
    if (settings.pin || settings.biometric) {
      setShowPinModal(true);
    } else {
      setIsLocked(false);
    }
  };

  // Save Month Doc helper
  const updateMonthDoc = async (updater: (prev: MonthDoc) => MonthDoc) => {
    setMonthDoc((prev) => {
      const updated = updater(prev);
      saveMonthDoc(currentMonth, updated, activeWsId);
      return updated;
    });
  };

  // Add Expense
  const handleAddExpense = (tx: ExpenseTx, repeatMonthly: boolean, dueDay?: number) => {
    updateMonthDoc((prev) => ({
      ...prev,
      tx: [tx, ...prev.tx]
    }));

    // Trigger local category budget limit alert (Push/Browser notification, chime, and in-app toast)
    const alertResult = checkAndDispatchBudgetAlert(
      tx,
      monthDoc,
      names,
      currentMonth,
      settings.l ?? 0
    );
    if (alertResult?.triggered) {
      haptics.warning();
      setActiveBudgetAlert(alertResult);
      setTimeout(() => setActiveBudgetAlert(null), 6500);
    } else {
      haptics.success();
    }

    if (repeatMonthly) {
      const newRec: RecurringExpense = {
        c: tx.c,
        a: tx.a,
        cu: tx.cu,
        w: tx.w,
        n: tx.n,
        dd: dueDay || 1
      };
      setRecurring((prev) => {
        const updated = [...prev, newRec];
        setItem('rec', { list: updated }, activeWsId);
        return updated;
      });
    }
  };

  // Edit Expense
  const handleEditExpense = (idx: number, updatedTx: ExpenseTx) => {
    updateMonthDoc((prev) => {
      const newTxList = [...prev.tx];
      newTxList[idx] = updatedTx;
      return { ...prev, tx: newTxList };
    });

    const alertResult = checkAndDispatchBudgetAlert(
      updatedTx,
      monthDoc,
      names,
      currentMonth,
      settings.l ?? 0
    );
    if (alertResult?.triggered) {
      setActiveBudgetAlert(alertResult);
      setTimeout(() => setActiveBudgetAlert(null), 6500);
    }
  };

  // Delete Expense
  const handleDeleteExpense = (idx: number) => {
    haptics.warning();
    const target = monthDoc.tx[idx];
    if (target) setLastDeletedTx(target);
    updateMonthDoc((prev) => {
      const newTxList = [...prev.tx];
      newTxList.splice(idx, 1);
      return { ...prev, tx: newTxList };
    });
  };

  // Undo Delete
  const handleUndoDelete = () => {
    if (!lastDeletedTx) return;
    updateMonthDoc((prev) => ({
      ...prev,
      tx: [lastDeletedTx, ...prev.tx]
    }));
    setLastDeletedTx(null);
  };

  // Apply Recurring to current month
  const handleApplyRecurring = () => {
    if (monthDoc.closed || monthDoc.rec === 1) return;
    const newTxs: ExpenseTx[] = recurring.map((r) => ({
      c: r.c,
      d: `${currentMonth}-${String(r.dd || 1).padStart(2, '0')}`,
      a: r.a,
      cu: r.cu,
      r: names.fx || 1500,
      w: r.w,
      n: r.n || ''
    }));

    updateMonthDoc((prev) => ({
      ...prev,
      tx: [...newTxs, ...prev.tx],
      rec: 1
    }));
  };

  const handleDeleteRecurring = (idx: number) => {
    setRecurring((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('rec', { list: updated }, activeWsId);
      return updated;
    });
  };

  // Savings Goal Handlers
  const handleAddGoal = (n: string, t: number, dt?: string, mt?: number) => {
    setGoals((prev) => {
      const updated = [...prev, { n, t, s: 0, dt, mt }];
      setItem('goals', { list: updated }, activeWsId);
      return updated;
    });
  };

  const handleUpdateGoal = (idx: number, updates: Partial<SavingsGoal>) => {
    setGoals((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], ...updates };
      }
      setItem('goals', { list: updated }, activeWsId);
      return updated;
    });
  };

  const handleDepositGoal = (goalIdx: number, depositAmount: number) => {
    haptics.success();
    const today = new Date().toISOString().slice(0, 10);
    // 1. Update Goal saved amount
    setGoals((prev) => {
      const updated = [...prev];
      if (updated[goalIdx]) {
        updated[goalIdx] = { ...updated[goalIdx], s: (updated[goalIdx].s || 0) + depositAmount };
      }
      setItem('goals', { list: updated }, activeWsId);
      return updated;
    });
    // 2. Add savings deposit to monthDoc
    updateMonthDoc((prev) => ({
      ...prev,
      sv: [...prev.sv, { g: goalIdx, a: depositAmount, d: today }]
    }));
  };

  const handleUndoDeposit = (depIdx: number) => {
    const dep = monthDoc.sv[depIdx];
    if (!dep) return;
    // Decrement from goal
    setGoals((prev) => {
      const updated = [...prev];
      if (updated[dep.g]) {
        updated[dep.g] = { ...updated[dep.g], s: Math.max(0, (updated[dep.g].s || 0) - dep.a) };
      }
      setItem('goals', { list: updated }, activeWsId);
      return updated;
    });
    // Remove from month
    updateMonthDoc((prev) => {
      const newSv = [...prev.sv];
      newSv.splice(depIdx, 1);
      return { ...prev, sv: newSv };
    });
  };

  const handleDeleteGoal = (idx: number) => {
    setGoals((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('goals', { list: updated }, activeWsId);
      return updated;
    });
  };

  // Wealth & Debts Handlers
  const handleAddAsset = (n: string, k: 'i' | 'u' | 'g' | 'o', v: number) => {
    setWealth((prev) => {
      const updated = { ...prev, as: [...prev.as, { n, k, v }] };
      setItem('wealth', updated, activeWsId);
      return updated;
    });
  };

  const handleDeleteAsset = (idx: number) => {
    setWealth((prev) => {
      const updatedAs = [...prev.as];
      updatedAs.splice(idx, 1);
      const updated = { ...prev, as: updatedAs };
      setItem('wealth', updated, activeWsId);
      return updated;
    });
  };

  const handleAddDebt = (debt: DebtItem) => {
    setDebts((prev) => {
      const updated = [...prev, debt];
      setItem('ppl', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handlePayDebt = (idx: number, payAmt: number) => {
    setDebts((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        const item = updated[idx];
        const newPaid = Math.min(item.a, item.p + payAmt);
        const actualPaid = newPaid - item.p;
        updated[idx] = { ...item, p: newPaid };

        // Link with Month Doc:
        // If borrowed debt ('b'), record payment as expense under category 31 (Debt repayment)
        if (item.k === 'b' && actualPaid > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const newTx: ExpenseTx = {
            c: 31,
            d: today,
            a: actualPaid,
            cu: item.cu,
            r: names.fx || 1500,
            w: 0,
            s: 0,
            n: `${t('dbt_repay_tx_note')}: ${item.n}`
          };
          updateMonthDoc((docPrev) => ({
            ...docPrev,
            tx: [newTx, ...docPrev.tx]
          }));
        } else if (item.k === 'l' && actualPaid > 0) {
          // If lent debt ('l'), receiving money back is added to other income
          const iqdAmount = item.cu === 'U' ? actualPaid * (names.fx || 1500) : actualPaid;
          updateMonthDoc((docPrev) => ({
            ...docPrev,
            oi: (docPrev.oi || 0) + iqdAmount
          }));
        }
      }
      setItem('ppl', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteDebt = (idx: number) => {
    setDebts((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('ppl', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleAddGold = (item: GoldItem) => {
    setGold((prev) => {
      const updated = [...prev, item];
      setItem('gold', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteGold = (idx: number) => {
    setGold((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('gold', { l: updated }, activeWsId);
      return updated;
    });
  };

  // Shopping Handlers
  const handleAddShopItem = (n: string, q: string, pr: number) => {
    setShopping((prev) => {
      const updated = [...prev, { n, q, pr, ck: 0 }];
      setItem('shop', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleBulkAddShop = (namesArr: string[]) => {
    setShopping((prev) => {
      const newItems = namesArr.map((name) => ({ n: name, pr: 0, ck: 0 }));
      const updated = [...prev, ...newItems];
      setItem('shop', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleToggleShopItem = (idx: number) => {
    setShopping((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], ck: updated[idx].ck ? 0 : 1 };
      }
      setItem('shop', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteShopItem = (idx: number) => {
    setShopping((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('shop', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleClearCheckedShop = () => {
    setShopping((prev) => {
      const updated = prev.filter((i) => !i.ck);
      setItem('shop', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleConvertShopToExpense = (checkedTotal: number, notes: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const newTx: ExpenseTx = {
      c: 6, // Groceries
      d: today,
      a: checkedTotal,
      cu: 'D',
      r: names.fx || 1500,
      w: 0,
      s: 1,
      n: notes
    };
    updateMonthDoc((prev) => ({
      ...prev,
      tx: [newTx, ...prev.tx]
    }));
    handleClearCheckedShop();
  };

  // Kumala Handlers
  const handleAddKumala = (item: KumalaItem) => {
    setKumala((prev) => {
      const updated = [...prev, item];
      setItem('kom', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handlePayKumalaMonth = (kIdx: number, mIdx: number) => {
    setKumala((prev) => {
      const updated = [...prev];
      const k = updated[kIdx];
      if (k && !k.pd[mIdx]) {
        const pdCopy = [...k.pd];
        pdCopy[mIdx] = 1;
        updated[kIdx] = { ...k, pd: pdCopy };

        // Create expense in category 30 (Rotating savings circle)
        const payMonthStr = shiftMonth(k.s, mIdx);
        const newTx: ExpenseTx = {
          c: 30,
          d: `${payMonthStr}-${String(k.dd || 1).padStart(2, '0')}`,
          a: k.a,
          cu: 'D',
          r: names.fx || 1500,
          w: 0,
          s: 0,
          n: `${k.n} (${mIdx + 1}/${k.m})`
        };

        if (payMonthStr === currentMonth) {
          updateMonthDoc((docPrev) => ({
            ...docPrev,
            tx: [newTx, ...docPrev.tx]
          }));
        }
      }
      setItem('kom', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleReceiveKumalaPot = (kIdx: number) => {
    setKumala((prev) => {
      const updated = [...prev];
      const k = updated[kIdx];
      if (k && !k.rc) {
        updated[kIdx] = { ...k, rc: 1 };
        // Add pot to other income in current month
        const potTotal = k.a * k.m;
        updateMonthDoc((docPrev) => ({
          ...docPrev,
          oi: (docPrev.oi || 0) + potTotal
        }));
      }
      setItem('kom', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteKumala = (idx: number) => {
    setKumala((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('kom', { l: updated }, activeWsId);
      return updated;
    });
  };

  // Events Handlers
  const handleAddEvent = (ev: EventItem) => {
    setEvents((prev) => {
      const updated = [...prev, ev];
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleAddEventItem = (evIdx: number, itemName: string, itemPrice: number) => {
    setEvents((prev) => {
      const updated = [...prev];
      if (updated[evIdx]) {
        updated[evIdx].it.push({ n: itemName, pr: itemPrice, ck: 0 });
      }
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleToggleEventItem = (evIdx: number, itemIdx: number) => {
    setEvents((prev) => {
      const updated = [...prev];
      if (updated[evIdx]?.it[itemIdx]) {
        const it = updated[evIdx].it[itemIdx];
        it.ck = it.ck ? 0 : 1;
      }
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteEventItem = (evIdx: number, itemIdx: number) => {
    setEvents((prev) => {
      const updated = [...prev];
      if (updated[evIdx]) {
        updated[evIdx].it.splice(itemIdx, 1);
      }
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDepositEvent = (evIdx: number, amt: number) => {
    setEvents((prev) => {
      const updated = [...prev];
      if (updated[evIdx]) {
        updated[evIdx].sv = (updated[evIdx].sv || 0) + amt;
      }
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteEvent = (idx: number) => {
    setEvents((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('evt', { l: updated }, activeWsId);
      return updated;
    });
  };

  // Dates Handlers
  const handleAddDate = (d: ImportantDateItem) => {
    setDates((prev) => {
      const updated = [...prev, d];
      setItem('dts', { l: updated }, activeWsId);
      return updated;
    });
  };

  const handleDeleteDate = (idx: number) => {
    setDates((prev) => {
      const updated = [...prev];
      updated.splice(idx, 1);
      setItem('dts', { l: updated }, activeWsId);
      return updated;
    });
  };

  // Sinking Fund Handlers
  const handleAddSinkingFund = (sfName: string, yearlyAmt: number) => {
    setWealth((prev) => {
      const updatedFu = [...(prev.fu || []), { n: sfName, a: yearlyAmt }];
      const updated = { ...prev, fu: updatedFu };
      setItem('wealth', updated, activeWsId);
      return updated;
    });
  };

  const handleDeleteSinkingFund = (idx: number) => {
    setWealth((prev) => {
      const updatedFu = [...(prev.fu || [])];
      updatedFu.splice(idx, 1);
      const updated = { ...prev, fu: updatedFu };
      setItem('wealth', updated, activeWsId);
      return updated;
    });
  };

  // Budget Table & Suggestions
  const handleUpdateBudget = (catIdx: number, val: number) => {
    updateMonthDoc((prev) => {
      const newBud = [...prev.bud];
      newBud[catIdx] = val;
      return { ...prev, bud: newBud };
    });
  };

  const handleApplyBudgetAllocation = (newBudgets: number[]) => {
    updateMonthDoc((prev) => ({
      ...prev,
      bud: [...newBudgets]
    }));
  };

  const handleSuggestBudget = async () => {
    if (monthDoc.closed) return;
    const prevMonths = [1, 2, 3].map((offset) => shiftMonth(currentMonth, -offset));
    const prevDocs = await Promise.all(prevMonths.map((m) => loadMonthDoc(m, activeWsId)));
    const prevTotalsList = prevDocs.map((d) => calcMonthTotals(d, names.fx || 1500));

    updateMonthDoc((prev) => {
      const newBud = [...prev.bud];
      CATEGORIES.forEach((_, idx) => {
        const avg = sum(prevTotalsList.map((t) => t.sp[idx])) / 3;
        if (avg > 0) {
          // Add a 5% buffer rounded to nearest 5,000
          newBud[idx] = Math.ceil((avg * 1.05) / 5000) * 5000;
        }
      });
      return { ...prev, bud: newBud };
    });
  };

  // Settings & Rates Updates
  const handleUpdateRates = (newFx: number, newGp: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setNames((prev) => {
      const updated = {
        ...prev,
        fx: newFx,
        gp: newGp,
        fxd: today,
        gpd: today
      };
      setItem('names', updated);
      return updated;
    });
  };

  const handleUpdateLimits = (limConfig: any) => {
    setNames((prev) => {
      const updated = { ...prev, lim: limConfig };
      setItem('names', updated);
      return updated;
    });
  };

  const handleUpdateMembers = (newMembers: any[]) => {
    setNames((prev) => {
      const updated = { ...prev, mem: newMembers };
      setItem('names', updated);
      return updated;
    });
  };

  const handleUpdateSettings = (partial: Partial<SettingsConfig>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      setItem('settings', updated);
      return updated;
    });
  };

  const handleSwitchWorkspace = (wsId: string) => {
    handleUpdateSettings({ acc: wsId });
  };

  const handleAddWorkspace = (wsName: string, icon: string) => {
    const newId = Math.random().toString(36).slice(2, 8);
    const newWs = { id: newId, n: wsName, i: icon };
    setNames((prev) => {
      const updated = {
        ...prev,
        accs: [...(prev.accs || []), newWs]
      };
      setItem('names', updated);
      return updated;
    });
    handleSwitchWorkspace(newId);
  };

  const handleDeleteWorkspace = (wsId: string) => {
    setNames((prev) => {
      const updated = {
        ...prev,
        accs: (prev.accs || []).filter((a) => a.id !== wsId)
      };
      setItem('names', updated);
      return updated;
    });
    if (settings.acc === wsId) {
      handleSwitchWorkspace('');
    }
  };

  const handleRenameWorkspace = (wsId: string, newName: string) => {
    setNames((prev) => {
      if (wsId === '') {
        const updated = { ...prev, mn: newName };
        setItem('names', updated);
        return updated;
      }
      const updated = {
        ...prev,
        accs: (prev.accs || []).map((a) => (a.id === wsId ? { ...a, n: newName } : a))
      };
      setItem('names', updated);
      return updated;
    });
  };

  const handleResetSettings = () => {
    const defaultSettings: SettingsConfig = {
      l: 0,
      th: 'auto',
      ac: '#0f766e',
      acc: '',
      ui: { fs: 15, r: 16, d: 16, ff: 0, hg: 1 }
    };
    setSettings(defaultSettings);
    setItem('settings', defaultSettings);
  };

  // JSON Import & Export
  const handleExportJSON = () => {
    exportBackupJSON(currentMonth.slice(0, 4), activeWsId, {
      goals,
      recurring,
      names,
      wealth,
      debts,
      shopping,
      kumala,
      gold,
      events,
      dates
    });
  };

  const handleExportCSV = () => {
    exportYearCSV(currentMonth.slice(0, 4), activeWsId, settings.l ?? 0);
  };

  const handleImportJSON = async (file: File) => {
    try {
      const content = await file.text();
      const backup = JSON.parse(content);
      if (backup.m && Array.isArray(backup.m)) {
        for (let i = 0; i < backup.m.length; i++) {
          const mStr = `${backup.y}-${String(i + 1).padStart(2, '0')}`;
          await saveMonthDoc(mStr, backup.m[i], activeWsId);
        }
      }
      if (backup.g?.list) {
        setGoals(backup.g.list);
        await setItem('goals', backup.g, activeWsId);
      }
      if (backup.r?.list) {
        setRecurring(backup.r.list);
        await setItem('rec', backup.r, activeWsId);
      }
      if (backup.n) {
        setNames(backup.n);
        await setItem('names', backup.n);
      }
      if (backup.w) {
        setWealth(backup.w);
        await setItem('wealth', backup.w, activeWsId);
      }
      if (backup.pl?.l) {
        setDebts(backup.pl.l);
        await setItem('ppl', backup.pl, activeWsId);
      }
      if (backup.sh?.l) {
        setShopping(backup.sh.l);
        await setItem('shop', backup.sh, activeWsId);
      }
      if (backup.km?.l) {
        setKumala(backup.km.l);
        await setItem('kom', backup.km, activeWsId);
      }
      if (backup.gl?.l) {
        setGold(backup.gl.l);
        await setItem('gold', backup.gl, activeWsId);
      }
      if (backup.ev?.l) {
        setEvents(backup.ev.l);
        await setItem('evt', backup.ev, activeWsId);
      }
      if (backup.dt?.l) {
        setDates(backup.dt.l);
        await setItem('dts', backup.dt, activeWsId);
      }
      // Reload current month
      const refreshed = await loadMonthDoc(currentMonth, activeWsId);
      setMonthDoc(refreshed);
      alert('Backup restored successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to restore backup file.');
    }
  };

  // Month Totals calculations
  const totals = calcMonthTotals(monthDoc, names.fx || 1500);
  const budgetedCatsCount = CATEGORIES.filter((_, i) => (monthDoc.bud[i] || 0) > 0).length;
  const adheredCatsCount = CATEGORIES.filter(
    (_, i) => (monthDoc.bud[i] || 0) > 0 && (totals.sp[i] || 0) <= (monthDoc.bud[i] || 0)
  ).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased selection:bg-emerald-500 selection:text-white">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-3 pb-24 md:pb-28">
        {/* Header */}
        <Header
          t={t}
          isLocked={isLocked}
          onToggleLock={handleToggleLock}
          currentMonth={currentMonth}
          onChangeMonth={setCurrentMonth}
          names={names}
          settings={settings}
          onSwitchWorkspace={handleSwitchWorkspace}
          onAddWorkspace={handleAddWorkspace}
          activeTab={activeTab}
          onOpenSettings={() => setActiveTab(prev => prev === 'settings' ? 'expenses' : 'settings')}
          isCloudConnected={Boolean(cloudUser)}
          onOpenCloudSync={() => setIsCloudModalOpen(true)}
          notifications={computeSmartNotifications(
            recurring,
            (monthDoc.tx || []).filter(tx => tx.d === new Date().toISOString().slice(0, 10)),
            monthDoc,
            names,
            settings.l ?? 0
          )}
          onOpenPdfReport={() => setIsPdfModalOpen(true)}
          onOpenAiAdvisor={() => setIsAiAdvisorOpen(true)}
        />

        {/* Floating Category Budget Limit Alert Toast */}
        {activeBudgetAlert && (
          <div className="fixed top-4 inset-x-0 mx-auto z-50 w-11/12 max-w-md p-3.5 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-2xl backdrop-blur-md border border-amber-500/40 animate-in fade-in slide-in-from-top-3 duration-200">
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeBudgetAlert.urgent ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {activeBudgetAlert.urgent ? <AlertTriangle className="w-5 h-5 animate-bounce" /> : <BellRing className="w-5 h-5 animate-pulse" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <h4 className="text-xs font-bold truncate text-amber-300">
                    {activeBudgetAlert.title}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold shrink-0">
                    %{Math.round(activeBudgetAlert.percentage)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {activeBudgetAlert.body}
                </p>
                <div className="w-full h-1.5 rounded-full bg-slate-700 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      activeBudgetAlert.urgent ? 'bg-rose-500' : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, activeBudgetAlert.percentage)}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveBudgetAlert(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Global Reminders: Stale Rates & Upcoming Dues */}
        <RatesBanner names={names} onUpdateRates={handleUpdateRates} t={t} />
        <DuesBanner
          debts={debts}
          recurring={recurring}
          kumala={kumala}
          dates={dates}
          langIndex={settings.l ?? 0}
          t={t}
        />

        {/* 7 Tab Views */}
        <main>
          {activeTab === 'expenses' && (
            <ExpensesTab
              currentMonth={currentMonth}
              doc={monthDoc}
              names={names}
              isLocked={isLocked}
              langIndex={settings.l ?? 0}
              t={t}
              recurring={recurring}
              goals={goals}
              onDepositGoal={handleDepositGoal}
              onUpdateRates={handleUpdateRates}
              onAddExpense={handleAddExpense}
              onEditExpense={handleEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onUndoDelete={handleUndoDelete}
              hasUndo={Boolean(lastDeletedTx)}
              onApplyRecurring={handleApplyRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              workspaceId={activeWsId}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              currentMonth={currentMonth}
              doc={monthDoc}
              names={names}
              isLocked={isLocked}
              langIndex={settings.l ?? 0}
              monthNames={MONTH_NAMES[settings.l ?? 0] || MONTH_NAMES[0]}
              t={t}
              onUpdateBudget={handleUpdateBudget}
              onSuggestBudget={handleSuggestBudget}
              onApplyBudgetAllocation={handleApplyBudgetAllocation}
              workspaceId={activeWsId}
              recurring={recurring}
              debts={debts}
              goals={goals}
            />
          )}

          {(activeTab === 'wealth' || activeTab === 'savings') && (
            <WealthTab
              currentMonth={currentMonth}
              wealth={wealth}
              debts={debts}
              gold={gold}
              names={names}
              averageMonthlyExpense={totals.exp || 1}
              monthlyIncome={totals.inc}
              savingsRate={totals.savingsRate}
              budgetedCount={budgetedCatsCount}
              adheredCount={adheredCatsCount}
              onAddAsset={handleAddAsset}
              onDeleteAsset={handleDeleteAsset}
              onAddDebt={handleAddDebt}
              onPayDebt={handlePayDebt}
              onDeleteDebt={handleDeleteDebt}
              onAddGold={handleAddGold}
              onDeleteGold={handleDeleteGold}
              t={t}
              goals={goals}
              deposits={monthDoc.sv || []}
              onAddGoal={handleAddGoal}
              onUpdateGoal={handleUpdateGoal}
              onDeposit={handleDepositGoal}
              onUndoDeposit={handleUndoDeposit}
              onDeleteGoal={handleDeleteGoal}
              initialSubTab={activeTab === 'savings' ? 'savings' : 'wealth'}
            />
          )}

          {(activeTab === 'more' || activeTab === 'shopping') && (
            <MoreTab
              currentMonth={currentMonth}
              fxRate={names.fx || 1500}
              kumala={kumala}
              events={events}
              dates={dates}
              sinkingFunds={wealth.fu || []}
              onAddKumala={handleAddKumala}
              onPayKumalaMonth={handlePayKumalaMonth}
              onReceiveKumalaPot={handleReceiveKumalaPot}
              onDeleteKumala={handleDeleteKumala}
              onAddEvent={handleAddEvent}
              onAddEventItem={handleAddEventItem}
              onToggleEventItem={handleToggleEventItem}
              onDeleteEventItem={handleDeleteEventItem}
              onDepositEvent={handleDepositEvent}
              onDeleteEvent={handleDeleteEvent}
              onAddDate={handleAddDate}
              onDeleteDate={handleDeleteDate}
              onAddSinkingFund={handleAddSinkingFund}
              onDeleteSinkingFund={handleDeleteSinkingFund}
              t={t}
              shoppingItems={shopping}
              onAddShopItem={handleAddShopItem}
              onBulkAddShop={handleBulkAddShop}
              onToggleShopItem={handleToggleShopItem}
              onDeleteShopItem={handleDeleteShopItem}
              onClearCheckedShop={handleClearCheckedShop}
              onConvertCheckedShopToExpense={handleConvertShopToExpense}
              initialTool={activeTab === 'shopping' ? 'shopping' : 'all'}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              currentMonth={currentMonth}
              doc={monthDoc}
              names={names}
              settings={settings}
              isLocked={isLocked}
              t={t}
              onUpdateIncome={(idx, amt) => {
                updateMonthDoc((prev) => {
                  const newInc = [...prev.inc];
                  newInc[idx] = amt;
                  return { ...prev, inc: newInc };
                });
              }}
              onUpdateOtherIncome={(amt) => {
                updateMonthDoc((prev) => ({ ...prev, oi: amt }));
              }}
              onToggleCloseMonth={() => {
                updateMonthDoc((prev) => ({
                  ...prev,
                  closed: prev.closed ? 0 : 1
                }));
              }}
              onCopyPrevMonth={async () => {
                if (monthDoc.closed) return;
                const prevM = shiftMonth(currentMonth, -1);
                const prevD = await loadMonthDoc(prevM, activeWsId);
                updateMonthDoc((prev) => ({
                  ...prev,
                  inc: prevD.inc && prevD.inc.length ? [...prevD.inc] : prev.inc,
                  oi: prevD.oi || 0,
                  bud: prevD.bud && prevD.bud.length ? [...prevD.bud] : prev.bud
                }));
              }}
              onUpdateLimits={handleUpdateLimits}
              onUpdateRates={handleUpdateRates}
              onUpdateMembers={handleUpdateMembers}
              onUpdateSettings={handleUpdateSettings}
              onSwitchWorkspace={handleSwitchWorkspace}
              onAddWorkspace={handleAddWorkspace}
              onDeleteWorkspace={handleDeleteWorkspace}
              onRenameWorkspace={handleRenameWorkspace}
              onResetSettings={handleResetSettings}
              onExportJSON={handleExportJSON}
              onExportCSV={handleExportCSV}
              onImportJSON={handleImportJSON}
            />
          )}
        </main>

        {/* Bottom Navigation with Center Elevated Expense Action */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onOpenAddExpense={() => setIsGlobalAddExpenseOpen(true)}
          t={t}
        />

        {/* Global Quick Add Expense Modal - Accessible from any tab */}
        <AddExpenseModal
          isOpen={isGlobalAddExpenseOpen}
          onClose={() => setIsGlobalAddExpenseOpen(false)}
          currentMonth={currentMonth}
          doc={monthDoc}
          names={names}
          langIndex={settings.l ?? 0}
          t={t}
          onAddExpense={handleAddExpense}
        />

        {/* PIN & Biometric Security Modal */}
        <PinModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          onSuccess={() => {
            setIsLocked(false);
            setShowPinModal(false);
          }}
          storedPinHash={settings.pin}
          biometricEnabled={settings.biometric}
          biometricCredId={settings.biometricCredId}
          t={t}
        />

        {/* Cloud Sync & Backup Modal */}
        <CloudSyncModal
          isOpen={isCloudModalOpen}
          onClose={() => setIsCloudModalOpen(false)}
          user={cloudUser}
          workspaceId={activeWsId}
          workspaceName={
            (names.accs || []).find(a => a.id === activeWsId)?.n || names.mn || 'پڕۆفایلی سەرەکی'
          }
          usdRate={names.fx || 1500}
          onUpdateFxRates={async (rates) => {
            const updated = { ...names, fxRates: rates };
            setNames(updated);
            await setItem('names', updated);
          }}
          onOpenPrivacyPolicy={() => {
            setIsCloudModalOpen(false);
            setIsPrivacyOpen(true);
          }}
          getFullBackupPayload={() => ({
            currentMonth,
            monthDoc,
            names,
            settings,
            goals,
            recurring,
            debts,
            shopping,
            kumala,
            gold,
            events,
            dates,
            wealth
          })}
          onRestoreBackup={async (raw: unknown) => {
            const data = raw as Record<string, any>;
            if (data.monthDoc) {
              setMonthDoc(data.monthDoc);
              await saveMonthDoc(currentMonth, data.monthDoc, activeWsId);
            }
            if (data.names) {
              setNames(data.names);
              await setItem('names', data.names);
            }
            if (data.goals) {
              setGoals(data.goals);
              await setItem('goals', { list: data.goals }, activeWsId);
            }
            if (data.recurring) {
              setRecurring(data.recurring);
              await setItem('rec', { list: data.recurring }, activeWsId);
            }
            if (data.debts) {
              setDebts(data.debts);
              await setItem('ppl', { l: data.debts }, activeWsId);
            }
            if (data.wealth) {
              setWealth(data.wealth);
              await setItem('wealth', data.wealth, activeWsId);
            }
          }}
        />

        {/* 1-Click PDF & Excel Report Modal */}
        <FinancialPDFReportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          currentMonth={currentMonth}
          doc={monthDoc}
          names={names}
          langIndex={settings.l ?? 0}
          monthNames={MONTH_NAMES[settings.l ?? 0] || MONTH_NAMES[0]}
          t={t}
        />

        {/* Privacy Policy & Terms Modal */}
        <PrivacyPolicyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />

        {/* AI Financial Advisor Modal */}
        <AIFinancialAdvisorModal
          isOpen={isAiAdvisorOpen}
          onClose={() => setIsAiAdvisorOpen(false)}
          currentMonth={currentMonth}
          doc={monthDoc}
          names={names}
          debts={debts}
          goals={goals}
          langIndex={settings.l ?? 0}
        />
      </div>
    </div>
  );
}
