import { RecurringExpense, ExpenseTx, ImpulseItem, MonthDoc, NamesConfig } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { fmt, val, calcMonthTotals } from './calculations';

export interface SmartNotification {
  id: string;
  title: string;
  body: string;
  type: 'bill' | 'impulse' | 'evening' | 'budget';
  urgent?: boolean;
  categoryIndex?: number;
  percentage?: number;
  spent?: number;
  budget?: number;
}

export interface BudgetAlertResult {
  triggered: boolean;
  categoryIndex: number;
  categoryName: string;
  spent: number;
  budget: number;
  percentage: number;
  urgent: boolean;
  title: string;
  body: string;
}

/**
 * Play a gentle two-tone chime via Web Audio API (zero audio assets required)
 */
export function playAlertChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // ignore on environments without audio support
  }
}

/**
 * Trigger subtle device vibration if supported
 */
export function triggerVibration(pattern: number[] = [150, 80, 150]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

/**
 * Request notification permissions from the OS/Browser
 */
export async function requestBrowserNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch {
    return false;
  }
}

/**
 * Send an OS-level or browser-level local notification
 */
export function sendBrowserNotification(title: string, body: string, icon = '/favicon.ico'): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // Attempt through ServiceWorkerRegistration if available (better on Android / PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: 'budget-alert'
        } as NotificationOptions);
      }).catch(() => {
        // Fallback to standard constructor
        new Notification(title, { body, icon });
      });
    } else {
      new Notification(title, { body, icon });
    }
  } catch {
    // ignore on platforms where new Notification throws in restricted iframes
  }
}

/**
 * Compute all smart in-app notifications (Recurring bills, impulse delay, evening recap, and category budget limits)
 */
export function computeSmartNotifications(
  recurring: RecurringExpense[],
  todayTxs: ExpenseTx[],
  doc?: MonthDoc,
  names?: NamesConfig,
  langIndex = 0
): SmartNotification[] {
  const list: SmartNotification[] = [];
  const now = new Date();
  const currentDom = now.getDate();

  // 1. Upcoming Recurring Bills (due within 3 days)
  recurring.forEach((bill, idx) => {
    const dueDay = bill.dd || 1;
    let diff = dueDay - currentDom;
    if (diff < 0) diff += 30;
    if (diff >= 0 && diff <= 3) {
      list.push({
        id: `bill_${idx}_${dueDay}`,
        title: diff === 0 ? `پسوولەی ئەمڕۆ: ${bill.n}` : `پسوولەی نزیک: ${bill.n}`,
        body:
          diff === 0
            ? `ئەمڕۆ کاتی دانی پسوولەی ${bill.n}ـە بە بڕی ${fmt(bill.a)} ${bill.cu === 'U' ? '$' : 'د.ع'}.`
            : `دوای ${diff} ڕۆژی تر کاتی دانی ${bill.n}ـە (${fmt(bill.a)} ${bill.cu === 'U' ? '$' : 'د.ع'}).`,
        type: 'bill',
        urgent: diff === 0
      });
    }
  });

  // 2. Category Budget Limit Warnings
  if (doc && doc.bud && names) {
    const defaultRate = names.fx || 1500;
    const totals = calcMonthTotals(doc, defaultRate);
    const catAlertsEnabled = names.lim?.catAlertsEnabled ?? true;
    const thresholdPct = names.lim?.catThreshold || names.lim?.p || 80;
    const watchedCats = names.lim?.watchedCats;

    if (catAlertsEnabled) {
      CATEGORIES.forEach((cat, idx) => {
        const b = doc.bud[idx] || 0;
        if (b <= 0) return;

        // Check if specifically watched (if watchedCats has items, only check those)
        if (watchedCats && watchedCats.length > 0 && !watchedCats.includes(idx)) {
          return;
        }

        const spent = totals.sp[idx] || 0;
        const pct = (spent / b) * 100;

        if (pct >= thresholdPct) {
          const catName = getCategoryName(cat, langIndex);
          const isOver = pct >= 100;
          const remaining = Math.max(0, b - spent);

          list.push({
            id: `cat_budget_${idx}_${Math.floor(pct / 10) * 10}`,
            title: isOver
              ? `تێپەڕاندنی بودجە: ${catName}`
              : `نزیکبوونەوە لە سنووری بودجە: ${catName}`,
            body: isOver
              ? `خەرجی ئەم پۆلە (${fmt(spent)} د.ع) لە سەرووی بودجەی دیاریکراوە (${fmt(b)} د.ع). ڕێژەی بەکارهێنان: %${Math.round(pct)}.`
              : `گەیشتووەتە %${Math.round(pct)}ی بودجە (${fmt(spent)} لە ${fmt(b)} د.ع). تەنها ${fmt(remaining)} د.ع لە سنوورەکە ماوە.`,
            type: 'budget',
            urgent: isOver || pct >= 90,
            categoryIndex: idx,
            percentage: pct,
            spent,
            budget: b
          });
        }
      });
    }
  }

  // 3. Completed 24-Hour Impulse Pauser Items
  try {
    const raw = localStorage.getItem('impulse_pauser_items');
    if (raw) {
      const items: ImpulseItem[] = JSON.parse(raw);
      const nowMs = Date.now();
      items.forEach((item) => {
        if (item.status === 'pending' && nowMs - item.createdAt >= 24 * 60 * 60 * 1000) {
          list.push({
            id: `impulse_${item.id}`,
            title: `٢٤ کاتژمێر تەواو بوو: ${item.n}`,
            body: `ئێستا دەتوانیت بە ئارامی بڕیار بدەیت: ئایا هێشتا پێویستت پێیەتی یان پاشەکەوتی دەکەیت؟`,
            type: 'impulse',
            urgent: true
          });
        }
      });
    }
  } catch {
    // ignore storage errors
  }

  // 4. Evening Reminder (after 8:00 PM if no expenses logged today)
  const hour = now.getHours();
  if (hour >= 20 && todayTxs.length === 0) {
    list.push({
      id: `evening_${now.toISOString().slice(0, 10)}`,
      title: 'پێداچوونەوەی ئێواران',
      body: 'ئەمڕۆ هیچ خەرجییەکت تۆمار نەکردووە. ئەگەر شتێکت کڕیوە، بە ١ کلیک تۆماری بکە.',
      type: 'evening'
    });
  }

  return list;
}

/**
 * Checks a specific category when an expense is added or updated.
 * Triggers an OS/Browser local notification and plays chime if nearing or exceeding limit.
 * Deduplicates to prevent spamming for the same category tier in the same month.
 */
export function checkAndDispatchBudgetAlert(
  tx: ExpenseTx,
  doc: MonthDoc,
  names: NamesConfig,
  currentMonth: string,
  langIndex = 0
): BudgetAlertResult | null {
  const catAlertsEnabled = names.lim?.catAlertsEnabled ?? true;
  if (!catAlertsEnabled) return null;

  const catIdx = tx.c;
  const budget = doc.bud?.[catIdx] || 0;
  if (budget <= 0) return null;

  // Check if specifically watched
  const watchedCats = names.lim?.watchedCats;
  if (watchedCats && watchedCats.length > 0 && !watchedCats.includes(catIdx)) {
    return null;
  }

  const defaultRate = names.fx || 1500;
  const currentCategorySpent = (doc.tx || [])
    .filter((t) => t.c === catIdx)
    .reduce((sum, t) => sum + val(t, defaultRate), 0);

  // Add the new transaction value
  const totalSpent = currentCategorySpent + val(tx, defaultRate);
  const pct = (totalSpent / budget) * 100;
  const thresholdPct = names.lim?.catThreshold || names.lim?.p || 80;

  if (pct < thresholdPct) return null;

  const isOver = pct >= 100;
  const tier = isOver ? '100' : '80';
  const notifKey = `budget_notif_sent_${currentMonth}_${catIdx}_${tier}`;

  const cat = CATEGORIES[catIdx];
  const catName = getCategoryName(cat, langIndex);
  const remaining = Math.max(0, budget - totalSpent);

  const title = isOver
    ? `تێپەڕاندنی بودجە: ${catName}`
    : `نزیکبوونەوە لە سنووری بودجە: ${catName}`;

  const body = isOver
    ? `خەرجی پۆلی «${catName}» بە تەواوی بودجەکەی تێپەڕاند! (${fmt(totalSpent)} لە ${fmt(budget)} د.ع - %${Math.round(pct)}).`
    : `خەرجی پۆلی «${catName}» گەیشتە %${Math.round(pct)}ی بودجە (${fmt(totalSpent)} لە ${fmt(budget)} د.ع). تەنها ${fmt(remaining)} د.ع ماوە.`;

  // Deduplicate: check if already notified this month at this tier
  let alreadySent = false;
  try {
    alreadySent = localStorage.getItem(notifKey) === 'true';
  } catch {
    // ignore
  }

  if (!alreadySent) {
    try {
      localStorage.setItem(notifKey, 'true');
    } catch {
      // ignore
    }

    // 1. Dispatch local browser/system notification
    sendBrowserNotification(title, body);

    // 2. Play sound if sound enabled
    if (names.lim?.soundEnabled ?? true) {
      playAlertChime();
    }

    // 3. Trigger vibration on mobile
    triggerVibration(isOver ? [250, 100, 250, 100, 250] : [150, 80, 150]);
  }

  return {
    triggered: true,
    categoryIndex: catIdx,
    categoryName: catName,
    spent: totalSpent,
    budget,
    percentage: pct,
    urgent: isOver,
    title,
    body
  };
}

/**
 * Send a test budget notification for user verification
 */
export async function sendTestBudgetNotification(catName = 'خۆراک و مارکێت'): Promise<boolean> {
  const granted = await requestBrowserNotifications();
  if (granted) {
    sendBrowserNotification(
      `تێستی ئاگاداری: نزیکبوونەوە لە سنووری ${catName}`,
      `ئاگاداری مۆبایل و براوسەر بۆ سنووری بودجەی پۆلەکان بە سەرکەوتوویی کار دەکات! (%٨٥ خەرجکراوە).`
    );
    playAlertChime();
    triggerVibration([150, 80, 150]);
    return true;
  }
  return false;
}
