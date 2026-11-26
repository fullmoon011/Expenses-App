import React, { useState, useRef } from 'react';
import {
  Wallet,
  Users,
  Palette,
  KeyRound,
  Database,
  Lock,
  Copy,
  Plus,
  Trash2,
  Undo2,
  Check,
  Languages,
  RotateCcw,
  DollarSign,
  Download,
  Upload,
  Smartphone,
  Coins,
  BellRing,
  CheckCircle2,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  AlertCircle,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  RefreshCw,
  FileSpreadsheet,
  ChevronUp,
  Cloud,
  Code2,
  FileCode,
  CheckCheck,
  X,
  Lightbulb
} from 'lucide-react';
import { NamesConfig, SettingsConfig, MonthDoc } from '../types';
import { LANGUAGES } from '../constants/translations';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { fmt } from '../utils/calculations';
import { requestBrowserNotifications, sendTestBudgetNotification } from '../utils/notifications';
import { haptics } from '../utils/haptics';
import { CategoryIcon } from './CategoryIcon';
import {
  sha256Hash,
  generateCloudCodeString,
  restoreFromCloudCodeString,
  downloadFile,
  exportStandaloneHTML
} from '../utils/storage';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  checkBiometricAvailability,
  registerBiometric,
  authenticateBiometric,
  BiometricSupportStatus
} from '../utils/biometrics';

interface SettingsTabProps {
  currentMonth: string;
  doc: MonthDoc;
  names: NamesConfig;
  settings: SettingsConfig;
  isLocked: boolean;
  t: (key: string) => string;
  onUpdateIncome: (memberIdx: number, amount: number) => void;
  onUpdateOtherIncome: (amount: number) => void;
  onToggleCloseMonth: () => void;
  onCopyPrevMonth: () => void;
  onUpdateLimits: (limitConfig: any) => void;
  onUpdateRates: (fx: number, gp: number) => void;
  onUpdateMembers: (newMembers: any[]) => void;
  onUpdateSettings: (newSettings: Partial<SettingsConfig>) => void;
  onSwitchWorkspace?: (id: string) => void;
  onAddWorkspace?: (name: string, icon: string) => void;
  onDeleteWorkspace?: (id: string) => void;
  onRenameWorkspace?: (id: string, newName: string) => void;
  onResetSettings?: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (file: File) => void;
}

type SettingsSection = 'finances' | 'appearance' | 'security';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentMonth,
  doc,
  names,
  settings,
  isLocked,
  t,
  onUpdateIncome,
  onUpdateOtherIncome,
  onToggleCloseMonth,
  onCopyPrevMonth,
  onUpdateLimits,
  onUpdateRates,
  onUpdateMembers,
  onUpdateSettings,
  onResetSettings,
  onExportJSON,
  onExportCSV,
  onImportJSON
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('finances');

  // Rates local state
  const [fxRate, setFxRate] = useState<number>(names.fx || 1500);
  const [ratesSaved, setRatesSaved] = useState(false);

  // Limits & Category Budget Alerts local state
  const [limPct, setLimPct] = useState<number>(names.lim?.p || 80);
  const [limMode, setLimMode] = useState<'' | 'p' | 'a'>(names.lim?.m || 'p');
  const [limitsSaved, setLimitsSaved] = useState(false);

  // Category Budget Alert Local Notification System state
  const [catAlertsEnabled, setCatAlertsEnabled] = useState<boolean>(names.lim?.catAlertsEnabled ?? true);
  const [catThreshold, setCatThreshold] = useState<number>(names.lim?.catThreshold || names.lim?.p || 80);
  const [watchScope, setWatchScope] = useState<'all' | 'specific'>(
    names.lim?.watchedCats && names.lim.watchedCats.length > 0 ? 'specific' : 'all'
  );
  const [watchedCategories, setWatchedCategories] = useState<number[]>(names.lim?.watchedCats || []);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(names.lim?.soundEnabled ?? true);
  const [browserNotifEnabled, setBrowserNotifEnabled] = useState<boolean>(names.lim?.browserNotif ?? true);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [testNotifSuccess, setTestNotifSuccess] = useState<boolean>(false);

  // PIN local state
  const [newPin, setNewPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');

  // Biometric local state
  const [bioStatus, setBioStatus] = useState<BiometricSupportStatus | null>(null);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState('');
  const [bioError, setBioError] = useState('');

  React.useEffect(() => {
    checkBiometricAvailability().then(setBioStatus);
  }, []);

  // Language search
  const [langSearch, setLangSearch] = useState('');

  // Reset confirmation modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Floating Action Button for Export All Data
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [exportedToast, setExportedToast] = useState<string | null>(null);

  const handleExportAll = () => {
    onExportJSON();
    setExportedSuccess(true);
    setExportedToast('فایلی یەدەگی هەموو داتاکان (JSON) بە سەرکەوتوویی دابەزێنرا!');
    setShowFabMenu(false);
    setTimeout(() => setExportedSuccess(false), 3000);
    setTimeout(() => setExportedToast(null), 3500);
  };

  // Cloud Code state & handlers
  const [generatedCloudCode, setGeneratedCloudCode] = useState('');
  const [generatedTsCode, setGeneratedTsCode] = useState('');
  const [isGeneratingCloudCode, setIsGeneratingCloudCode] = useState(false);
  const [copiedCloudCode, setCopiedCloudCode] = useState(false);
  const [copiedTsCode, setCopiedTsCode] = useState(false);
  const [cloudCodeTab, setCloudCodeTab] = useState<'cloudCode' | 'tsCode'>('cloudCode');
  const [inputCloudCode, setInputCloudCode] = useState('');
  const [restoreCloudLoading, setRestoreCloudLoading] = useState(false);
  const [restoreCloudMsg, setRestoreCloudMsg] = useState('');
  const [restoreCloudError, setRestoreCloudError] = useState('');

  const handleGenerateCloudCode = async () => {
    setIsGeneratingCloudCode(true);
    setRestoreCloudMsg('');
    setRestoreCloudError('');
    try {
      const yearStr = currentMonth.slice(0, 4);
      const res = await generateCloudCodeString(yearStr);
      setGeneratedCloudCode(res.cloudCode);
      setGeneratedTsCode(res.tsCode);
    } catch {
      setRestoreCloudError('هەڵەیەک ڕوویدا لە کاتی ئامادەکردنی کۆدی کڵاود');
    } finally {
      setIsGeneratingCloudCode(false);
    }
  };

  const handleCopyCloudCode = () => {
    if (!generatedCloudCode) return;
    navigator.clipboard.writeText(generatedCloudCode);
    setCopiedCloudCode(true);
    setTimeout(() => setCopiedCloudCode(false), 2500);
  };

  const handleCopyTsCode = () => {
    if (!generatedTsCode) return;
    navigator.clipboard.writeText(generatedTsCode);
    setCopiedTsCode(true);
    setTimeout(() => setCopiedTsCode(false), 2500);
  };

  const handleDownloadTsCode = () => {
    if (!generatedTsCode) return;
    downloadFile('financial-data-cloud.ts', generatedTsCode, 'text/typescript');
  };

  const handleRestoreFromCloudCode = async () => {
    if (!inputCloudCode.trim()) return;
    setRestoreCloudLoading(true);
    setRestoreCloudMsg('');
    setRestoreCloudError('');
    try {
      const res = await restoreFromCloudCodeString(inputCloudCode);
      if (res.success) {
        setRestoreCloudMsg(res.message);
        setInputCloudCode('');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setRestoreCloudError(res.message);
      }
    } catch (err: any) {
      setRestoreCloudError(err?.message || 'هەڵە لە گەڕاندنەوەی کۆد');
    } finally {
      setRestoreCloudLoading(false);
    }
  };

  const handleExportCSVWithToast = () => {
    onExportCSV();
    setExportedSuccess(true);
    setExportedToast('ڕاپۆرتی دارایی هەموو داتاکان (Excel CSV) دابەزێنرا!');
    setShowFabMenu(false);
    setTimeout(() => setExportedSuccess(false), 3000);
    setTimeout(() => setExportedToast(null), 3500);
  };

  const handleExportHTMLWithToast = () => {
    exportStandaloneHTML(currentMonth.slice(0, 4));
    setExportedSuccess(true);
    setExportedToast('فایلی تەواوی کارەکەت بە HTML (Standalone Web App) بە سەرکەوتوویی دابەزێنرا!');
    setShowFabMenu(false);
    setTimeout(() => setExportedSuccess(false), 3000);
    setTimeout(() => setExportedToast(null), 3500);
  };

  // PWA install hook
  const { isInstalled, promptInstall } = usePWAInstall();

  // Avatar and color presets
  const avatarOptions = ['user', 'user-round', 'smile', 'heart', 'star', 'crown', 'baby'];
  const accentPresets = [
    '#0f766e', // Classic Teal Emerald
    '#06b6d4', // Cyber Neon Cyan
    '#10b981', // Electric Neon Emerald
    '#a855f7', // Synthwave Neon Purple
    '#f43f5e', // Neon Rose / Pink
    '#eab308', // Radiant Amber / Gold
    '#2563eb', // Vivid Royal Blue
    '#ea580c', // Bright Orange
    '#16a34a', // Forest Green
    '#475569', // Modern Slate
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const members = names.mem || [{ n: 'Person 1', e: 'user' }];

  // Rates saver
  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateRates(fxRate, names.gp || 0);
    setRatesSaved(true);
    setTimeout(() => setRatesSaved(false), 2500);
  };

  // Limits saver
  const handleSaveLimits = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onUpdateLimits({
      p: catThreshold,
      m: limMode,
      v: names.lim?.v || 0,
      catAlertsEnabled,
      catThreshold,
      watchedCats: watchScope === 'specific' ? watchedCategories : [],
      browserNotif: browserNotifEnabled,
      soundEnabled
    });
    setLimitsSaved(true);
    setTimeout(() => setLimitsSaved(false), 2500);
  };

  const handleToggleWatchedCat = (catIdx: number) => {
    setWatchedCategories((prev) => {
      const exists = prev.includes(catIdx);
      if (exists) {
        return prev.filter((i) => i !== catIdx);
      } else {
        return [...prev, catIdx];
      }
    });
  };

  const handleTestNotification = async () => {
    const granted = await requestBrowserNotifications();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
    if (granted) {
      const catIdx = watchedCategories.length > 0 ? watchedCategories[0] : 6;
      const cat = CATEGORIES[catIdx];
      const catName = cat ? getCategoryName(cat, settings.l ?? 0) : 'خۆراک و مارکێت';
      await sendTestBudgetNotification(catName);
      setTestNotifSuccess(true);
      setTimeout(() => setTestNotifSuccess(false), 3500);
    }
  };

  // PIN handlers
  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) return;
    const hash = await sha256Hash(newPin);
    onUpdateSettings({ pin: hash });
    setNewPin('');
    setPinSuccessMsg(t('pin_set_success') || 'کۆدی نهێنی بە سەرکەوتوویی کارا کرا');
    setTimeout(() => setPinSuccessMsg(''), 3000);
  };

  const handleRemovePin = () => {
    onUpdateSettings({ pin: undefined });
    setPinSuccessMsg(t('pin_removed_success') || 'کۆدی نهێنی لادرا');
    setTimeout(() => setPinSuccessMsg(''), 3000);
  };

  // Biometric handlers
  const handleToggleBiometric = async () => {
    if (settings.biometric) {
      onUpdateSettings({ biometric: false, biometricCredId: undefined });
      setBioMessage('قفڵی بایۆمەتری ناچالاک کرا');
      setBioError('');
      setTimeout(() => setBioMessage(''), 3000);
      return;
    }

    setBioLoading(true);
    setBioMessage('');
    setBioError('');
    try {
      const res = await registerBiometric(names.mn || 'Expense User');
      if (res.success && res.credentialId) {
        onUpdateSettings({ biometric: true, biometricCredId: res.credentialId });
        setBioMessage(
          res.isSimulated
            ? 'قفڵی پەنجەمۆر و دەموچاو چالاک کرا (پارێزراو)'
            : 'قفڵی بایۆمەتری (پەنجەمۆر / Face ID) بە سەرکەوتوویی چالاک کرا'
        );
      } else {
        setBioError(res.error || 'نەتوانرا پەنجەمۆر تۆمار بکرێت');
      }
    } catch (err: any) {
      setBioError(err?.message || 'هەڵەیەک ڕوویدا لە کاتی پەیوەندیکردن بە سێنسەری بایۆمەتری');
    } finally {
      setBioLoading(false);
      setTimeout(() => {
        setBioMessage('');
      }, 4000);
    }
  };

  const handleTestBiometric = async () => {
    setBioLoading(true);
    setBioMessage('');
    setBioError('');
    try {
      const res = await authenticateBiometric(settings.biometricCredId);
      if (res.success) {
        setBioMessage('پشکنینی پەنجەمۆر بە سەرکەوتوویی تاقیکرایەوە! ناسینەوە تەواو و دروستە.');
      } else {
        setBioError(res.error || 'پەنجەمۆر نەناسرایەوە یان ڕەتکرایەوە');
      }
    } catch (err: any) {
      setBioError(err?.message || 'هەڵە لە تاقیکردنەوەی پەنجەمۆر');
    } finally {
      setBioLoading(false);
      setTimeout(() => {
        setBioMessage('');
      }, 4000);
    }
  };

  // Members handlers
  const handleAddMember = () => {
    const newIdx = members.length + 1;
    onUpdateMembers([...members, { n: `${t('user') || 'ئەندام'} ${newIdx}`, e: 'user' }]);
  };

  const handleRenameMember = (idx: number, newName: string) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], n: newName };
    onUpdateMembers(updated);
  };

  const handleSelectAvatar = (idx: number, avatar: string) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], e: avatar };
    onUpdateMembers(updated);
  };

  const handleSoftDeleteMember = (idx: number) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], x: 1 };
    onUpdateMembers(updated);
  };

  const handleRestoreMember = (idx: number) => {
    const updated = [...members];
    const { x, ...rest } = updated[idx];
    updated[idx] = rest;
    onUpdateMembers(updated);
  };

  // Filter languages (primary ones first)
  const topLanguageCodes = ['ckb', 'kmr', 'ar', 'en'];
  const filteredLanguages = LANGUAGES.filter((l) => {
    if (!langSearch.trim()) return true;
    const q = langSearch.toLowerCase();
    return (
      l.native.toLowerCase().includes(q) ||
      l.sorani.toLowerCase().includes(q) ||
      l.english.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 pb-14 max-w-4xl mx-auto">
      {/* 1. Streamlined Top Category Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-1.5 shadow-xs border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSection('finances')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'finances'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>نرخ و داهات و خێزان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('appearance')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'appearance'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>ڕووکار و زمان</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === 'security'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>ئاسایش و داتاکان</span>
        </button>
      </div>

      {/* SECTION 1: FINANCES (Rates, Income & Family Members) */}
      {activeSection === 'finances' && (
        <div className="space-y-4">
          {/* A. Exchange Rate Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    نرخی گۆڕینەوەی دۆلار (FX Rate)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    نرخی ۱۰۰ دۆلار یان ۱ دۆلار بەرامبەر دیناری عێراقی بۆ حیساباتی ئەپەکە
                  </p>
                </div>
              </div>

              {ratesSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                  <Check className="w-3.5 h-3.5" />
                  <span>پاشەکەوت کرا</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveRates} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  min="1000"
                  step="5"
                  value={fxRate}
                  onChange={(e) => setFxRate(+e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                  IQD / $1
                </span>
              </div>
              <button
                type="submit"
                className="py-2 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>نوێکردنەوەی نرخ</span>
              </button>
            </form>
          </div>

          {/* B. Monthly Income & Quick Month Operations */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    داهات و مووچەی مانگانە ({currentMonth})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مووچە و داهاتە جیاوازەکانی خێزان بۆ ئەم مانگە
                  </p>
                </div>
              </div>
            </div>

            {isLocked ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs text-slate-400 flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                <span>داهات شاراوەیە لەبەر ئاسایشی PIN</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {members.map((m, idx) =>
                    !m.x ? (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <CategoryIcon name={m.e || 'user'} className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                            مووچەی {m.n}
                          </span>
                        </div>
                        <div className="relative w-36">
                          <input
                            type="number"
                            min="0"
                            step="10000"
                            value={doc.inc[idx] || ''}
                            onChange={(e) => onUpdateIncome(idx, +e.target.value)}
                            placeholder="0 IQD"
                            className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-end"
                          />
                        </div>
                      </div>
                    ) : null
                  )}

                  {/* Other Income */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        داهاتی تر
                      </span>
                    </div>
                    <div className="relative w-36">
                      <input
                        type="number"
                        min="0"
                        step="10000"
                        value={doc.oi || ''}
                        onChange={(e) => onUpdateOtherIncome(+e.target.value)}
                        placeholder="0 IQD"
                        className="w-full py-1.5 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono font-bold text-end"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Month Actions Bar */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5">
                  <span className="text-xs font-semibold text-slate-500">
                    کردارە خێراکانی مانگ:
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onCopyPrevMonth}
                      disabled={Boolean(doc.closed)}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 disabled:opacity-40 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>کۆپیکردنی بودجەی مانگی پێشوو</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleCloseMonth}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        doc.closed
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{doc.closed ? 'کردنەوەی مانگ (دەستکاری بکرێت)' : 'داخستنی مانگ (تەنها بینین)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* C. Family Members Management Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    ئەندامانی خێزان
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ناوی ئەندامان و ئایکۆنەکانیان
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddMember}
                className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ئەندامی نوێ</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition ${
                    m.x
                      ? 'bg-slate-50 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-60'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      disabled={Boolean(m.x)}
                      value={m.n}
                      onChange={(e) => handleRenameMember(idx, e.target.value)}
                      className="flex-1 py-1 px-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold"
                    />

                    {m.x ? (
                      <button
                        type="button"
                        onClick={() => handleRestoreMember(idx)}
                        className="py-1 px-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/60 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>گەڕاندنەوە</span>
                      </button>
                    ) : (
                      members.filter((mem) => !mem.x).length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleSoftDeleteMember(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg cursor-pointer"
                          title="سڕینەوە"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>

                  {!m.x && (
                    <div className="flex gap-1.5 overflow-x-auto py-1">
                      {avatarOptions.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => handleSelectAvatar(idx, av)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            m.e === av
                              ? 'bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-600'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <CategoryIcon name={av} className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* D. Category Budget Limit Local Notification System */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>ئاگادارییەکانی مۆبایل بۆ سنووری بودجەی پۆلەکان</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold">
                      Local Alerts
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ئاگادارکردنەوەی خۆکارانە لەسەر مۆبایل و براوسەر کاتێک خەرجی لە سنووری بودجە نزیک دەبێتەوە
                  </p>
                </div>
              </div>

              {limitsSaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                  <Check className="w-4 h-4" />
                  <span>پاشەکەوت کرا!</span>
                </span>
              )}
            </div>

            {/* Master Switch */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  چالاککردنی سیستەمی ئاگادارییەکان
                </span>
                <span className="text-[11px] text-slate-400">
                  ناردنی هۆشداری کاتێک خەرجی لە سنووری بودجە نزیک دەبێتەوە یان تێدەپەڕێت
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={catAlertsEnabled}
                  onChange={(e) => setCatAlertsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {catAlertsEnabled && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                {/* 1. Device Permission & Test Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${notifPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      <span>
                        {notifPermission === 'granted'
                          ? 'ئاگادارییەکانی مۆبایل و براوسەر ڕێگەپێدراون'
                          : 'ڕێگەپێدانی ئاگاداری مۆبایل پێویستە'}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {notifPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await requestBrowserNotifications();
                          setNotifPermission(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default');
                        }}
                        className="py-1.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                      >
                        ڕێگەپێدان بە نۆتیفیکەیشن
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      {testNotifSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>نێردرا!</span>
                        </>
                      ) : (
                        <>
                          <BellRing className="w-3.5 h-3.5" />
                          <span>تێستی ئاگاداری</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Alert Threshold Slider & Quick Chips */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        ئاستی هۆشداری (Alert Threshold)
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        کاتێک خەرجی گەیشتە ئەم ڕێژەیەی بودجە، دەستبەجێ ئاگادارت دەکاتەوە
                      </span>
                    </div>
                    <span className="text-base font-black font-mono text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-xl border border-teal-200 dark:border-teal-800">
                      %{catThreshold}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="50"
                      max="100"
                      step="5"
                      value={catThreshold}
                      onChange={(e) => setCatThreshold(+e.target.value)}
                      className="flex-1 accent-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* Preset chips */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">ڕێژە باوەکان:</span>
                    {[70, 75, 80, 85, 90, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCatThreshold(pct)}
                        className={`py-1 px-2.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                          catThreshold === pct
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        }`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Category Scope Selector (All vs Specific) */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        پۆلە چاودێریکراوەکان بۆ ئاگاداری
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        دەتوانیت تەنها پۆلی دیاریکراو وەک خۆراک، سووتەمەنی، یان بازاڕکردن دیاری بکەیت
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setWatchScope('all')}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          watchScope === 'all'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        سەرجەم بودجەکان
                      </button>
                      <button
                        type="button"
                        onClick={() => setWatchScope('specific')}
                        className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          watchScope === 'specific'
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        پۆلە دیاریکراوەکان {watchedCategories.length > 0 && `(${watchedCategories.length})`}
                      </button>
                    </div>
                  </div>

                  {/* Specific category checkboxes grid when watchScope === 'specific' */}
                  {watchScope === 'specific' && (
                    <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          کلیک لەسەر ئەو پۆلانە بکە کە دەتەوێت ئاگادارییان بۆ چالاک بێت:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const budgeted = CATEGORIES.map((_, i) => i).filter(i => (doc.bud?.[i] || 0) > 0);
                              setWatchedCategories(budgeted);
                            }}
                            className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                          >
                            تەنها خاوەن بودجەکان
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => setWatchedCategories([])}
                            className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                          >
                            پاککردنەوە
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                        {CATEGORIES.map((cat, idx) => {
                          const isSelected = watchedCategories.includes(idx);
                          const b = doc.bud?.[idx] || 0;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleToggleWatchedCat(idx)}
                              className={`p-2 rounded-xl border text-start transition flex items-center gap-2 cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-500 text-teal-900 dark:text-teal-100 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                              }`}>
                                <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold block truncate">
                                  {getCategoryName(cat, settings.l ?? 0)}
                                </span>
                                <span className="text-[10px] text-slate-400 block truncate font-mono">
                                  {b > 0 ? `${fmt(b)} د.ع` : 'بێ بودجە'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Alert Preferences (Sound & Vibration, OS Notification) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      ئاگاداری لە دەلاقەی مۆبایل و سیستەم (Push / Local)
                    </span>
                    <input
                      type="checkbox"
                      checked={browserNotifEnabled}
                      onChange={(e) => setBrowserNotifEnabled(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      دەنگی زەنگ و لەرزین (Chime & Vibration)
                    </span>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveLimits}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>پاشەکەوتکردنی ڕێکخستنەکانی ئاگاداری</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: APPEARANCE & LANGUAGE */}
      {activeSection === 'appearance' && (
        <div className="space-y-4">
          {/* A. Language Selection Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Languages className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    زمانی ئەپەکە
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    زمانی دڵخوازی خۆت هەڵبژێرە
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Primary Languages Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { code: 'ckb', name: 'کوردی (سۆرانی)', idx: 0 },
                { code: 'ar', name: 'العربية', idx: 1 },
                { code: 'en', name: 'English', idx: 2 },
                { code: 'kmr', name: 'Kurdî (Badînî)', idx: 3 }
              ].map((lang) => {
                const isSelected = (settings.l ?? 0) === lang.idx;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => onUpdateSettings({ l: lang.idx })}
                    className={`py-3 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 text-teal-800 dark:text-teal-200 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span>{lang.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                );
              })}
            </div>

            {/* Other Languages Search if needed */}
            <div className="pt-2">
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder="گەڕان بۆ زمانەکانی تر..."
                className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
              />

              {langSearch.trim() && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {filteredLanguages.map((lang) => {
                    const originalIndex = LANGUAGES.findIndex((l) => l.code === lang.code);
                    const isSelected = (settings.l ?? 0) === originalIndex;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => onUpdateSettings({ l: originalIndex })}
                        className={`p-2 rounded-lg border text-xs text-start transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 font-bold text-teal-700'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span>{lang.native}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* B. Theme & Accent Colors Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    ڕووکار و ڕەنگەکان
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    دۆخی ڕووناک، تاریک، نیۆن یان ڕەنگی سەرەکی
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Mode Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                شێوازی ڕووکار:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'light', label: 'ڕووناک (Light)', icon: Sun },
                  { id: 'dark', label: 'تاریک (Dark)', icon: Moon },
                  { id: 'oled', label: 'ڕەشی تەواو (OLED)', icon: Smartphone },
                  { id: 'neon', label: 'نیۆن (Neon)', icon: Sparkles },
                  { id: 'auto', label: 'خۆکار (System)', icon: Laptop }
                ].map(({ id, label, icon: Icon }) => {
                  const isSelected = (settings.th || 'auto') === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        if (id === 'neon' && (!settings.ac || settings.ac === '#0f766e')) {
                          onUpdateSettings({ th: 'neon', ac: '#06b6d4' });
                        } else {
                          onUpdateSettings({ th: id as any });
                        }
                      }}
                      className={`py-2.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? id === 'neon'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.45)]'
                            : id === 'oled'
                            ? 'bg-black text-white border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                            : 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                دۆخی (OLED) ڕەشی تەواوە (#000000) بۆ مۆبایلە شاشە AMOLEDەکان، باتری دەپارێزێت و چاو ئارام دەکات.
              </p>
            </div>

            {/* Mobile Haptic Feedback Toggle */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                    لەرینەوەی پەنجە (Haptic Feedback)
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    لەرینەوەیەکی نەرم لە کاتی تۆمارکردنی خەرجی و گۆڕینی بەشەکان
                  </span>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.haptics !== false}
                onClick={() => {
                  const next = settings.haptics === false;
                  haptics.setEnabled(next);
                  if (next) haptics.medium();
                  onUpdateSettings({ haptics: next });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.haptics !== false ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.haptics !== false ? 'rtl:-translate-x-5 ltr:translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Accent Color Palette */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                ڕەنگی سەرەکی ئەپەکە:
              </label>

              <div className="flex items-center gap-2.5 flex-wrap">
                {accentPresets.map((color) => {
                  const isCurrent = (settings.ac || '#0f766e').toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        onUpdateSettings({ ac: color });
                      }}
                      style={{ backgroundColor: color }}
                      className={`w-8 h-8 rounded-full border-2 transition cursor-pointer ${
                        isCurrent
                          ? 'border-white ring-3 ring-cyan-400 scale-110 shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      title={color}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SECURITY & DATA BACKUP */}
      {activeSection === 'security' && (
        <div className="space-y-4">
          {/* 1. Biometric Lock (Fingerprint & Face ID) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      قفڵی بایۆمەتری (Biometric Lock)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                      پەنجەمۆر / Face ID
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    کردنەوەی خێرای ئەپڵیکەیشن بە پەنجەمۆر یان ناسینەوەی دەموچاوی ئامێرەکەت
                  </p>
                </div>
              </div>

              {bioStatus && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${bioStatus.supported ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span>{bioStatus.supported ? 'ئامێرەکە پشتگیری دەکات' : 'پشتگیری ناکرێت'}</span>
                </div>
              )}
            </div>

            {/* Biometric Status / Controls */}
            {settings.biometric ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>قفڵی پەنجەمۆر و دەموچاو چالاکە و ئەپەکە پارێزراوە</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestBiometric}
                    disabled={bioLoading}
                    className="py-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {bioLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ScanFace className="w-3.5 h-3.5" />
                    )}
                    <span>تاقیکردنەوە</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleBiometric}
                    disabled={bioLoading}
                    className="py-1.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    ناچالاککردن
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    ئایا دەتەوێت بە پەنجەمۆر یان ڕووخسار ئەپەکە بکەیتەوە؟
                  </p>
                  <p className="text-[11px] text-slate-500">
                    تەواوکەری کۆدی PIN ە و دەستڕاگەیشتن زۆر خێراتر و پارێزراوتر دەکات.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleBiometric}
                  disabled={bioLoading}
                  className="py-2 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {bioLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>پشکنینی ئامێر...</span>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      <span>چالاککردنی پەنجەمۆر / Face ID</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {bioMessage && (
              <p className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{bioMessage}</span>
              </p>
            )}

            {bioError && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 animate-in fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{bioError}</span>
              </p>
            )}
          </div>

          {/* 2. PIN Lock Protection Card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    کۆدی نهێنی (PIN Lock)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    بۆ پاراستنی خەرجی و داهاتەکانت لە دەستی کەسانی تر
                  </p>
                </div>
              </div>
            </div>

            {settings.pin ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>کۆدی نهێنی چالاکە و ئەپەکە پارێزراوە</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="py-1.5 px-3 bg-red-100 hover:bg-red-200 dark:bg-red-950/70 text-red-700 dark:text-red-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  سڕینەوەی کۆد
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetPin} className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="کۆدی نوێ دابنێ (لانیکەم ٤ ژمارە)..."
                  className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold font-mono focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={newPin.length < 4}
                  className="py-2 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>چالاککردنی PIN</span>
                </button>
              </form>
            )}

            {pinSuccessMsg && (
              <p className="text-xs text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>{pinSuccessMsg}</span>
              </p>
            )}
          </div>

          {/* B. Install App as PWA */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  دابەزاندنی ئەپ لەسەر مۆبایل و کۆمپیوتەر
                </h3>
                <p className="text-[11px] text-slate-500">
                  وەک ئەپڵیکەیشنی ڕاستەوخۆ کار دەکات و بەبێ ئینتەرنێتیش دەکرێتەوە
                </p>
              </div>
            </div>

            {isInstalled ? (
              <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5 self-start sm:self-auto">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>دابەزێنراوە</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={promptInstall}
                className="py-2 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer self-start sm:self-auto"
              >
                <Smartphone className="w-4 h-4" />
                <span>دابەزاندن ئێستا</span>
              </button>
            )}
          </div>

          {/* C. Backup, Export & Restore */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    کۆپی یەدەگ و پاراستنی داتاکان
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    داتاکانت دابەزێنە یان فایلی پێشوو بگێڕەوە
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={onExportJSON}
                className="py-2.5 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دابەزاندنی کۆپی (JSON)</span>
              </button>

              <button
                type="button"
                onClick={onExportCSV}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>هەناردەکردن بۆ ئێکسڵ (CSV)</span>
              </button>

              <button
                type="button"
                onClick={handleExportHTMLWithToast}
                className="py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                title="داگرتنی هەموو کارەکەت بە شێوەی فایلی خۆبژێوی HTML بۆ کارکردن لەسەر وێب"
              >
                <FileCode className="w-4 h-4 text-emerald-200" />
                <span>داگرتنی کارەکەم (HTML)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>گەڕاندنەوەی فایلی کۆپی</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                hidden
                onChange={(e) => e.target.files?.[0] && onImportJSON(e.target.files[0])}
              />
            </div>

            {/* Reset Defaults button */}
            {onResetSettings && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="py-1.5 px-3.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700 dark:hover:bg-red-950/60 dark:hover:text-red-300 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>گەڕاندنەوەی ڕێکخستنە سەرەتاییەکان</span>
                </button>
              </div>
            )}
          </div>

          {/* D. Cloud Code & Online Work */}
          <div className="bg-gradient-to-br from-indigo-900/10 via-purple-900/10 to-teal-900/10 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-teal-950/30 bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs border border-indigo-200 dark:border-indigo-800/60 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 shadow-2xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                      کۆدی کڵاود و کارکردن لەسەر ئینتەرنێت (Cloud Code)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                      کۆدکردنی فایلەکان
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    گۆڕینی هەموو داتا و فایلە تایبەتەکانت بۆ کۆدی شیکراوە و پەڕگەی دەستبەجێ بۆ کارکردن لە کڵاود و ئامێرەکانی تر
                  </p>
                </div>
              </div>
            </div>

            {/* Action 1: Generate Code */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>دروستکردنی کۆد لە داتا و فایلە تایبەتەکانت:</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    کۆدی ئامادەکراو دروست دەکات کە دەتوانیت لە کڵاود، کۆمپیوتەر، یان ئامێری تر بەکاریبهێنیتەوە.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateCloudCode}
                  disabled={isGeneratingCloudCode}
                  className="py-2 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  {isGeneratingCloudCode ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>دروستکردنی کۆدی کڵاود ئێستا</span>
                </button>
              </div>

              {/* Display Generated Cloud Code */}
              {generatedCloudCode && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-indigo-200 dark:border-indigo-800/70 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {/* Tab Switcher: Cloud String vs TypeScript Code */}
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setCloudCodeTab('cloudCode')}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          cloudCodeTab === 'cloudCode'
                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        کۆدی کڵاود (Portable String)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCloudCodeTab('tsCode')}
                        className={`px-3 py-1 rounded-md transition cursor-pointer ${
                          cloudCodeTab === 'tsCode'
                            ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        فایلی کۆد (TypeScript .ts)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {cloudCodeTab === 'cloudCode' ? (
                        <button
                          type="button"
                          onClick={handleCopyCloudCode}
                          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                        >
                          {copiedCloudCode ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5" />
                              <span>کۆپیکرا!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>کۆپیکردنی کۆد</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={handleCopyTsCode}
                            className="py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          >
                            {copiedTsCode ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span>کۆپیکرا!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>کۆپیکردن</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadTsCode}
                            className="py-1 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs cursor-pointer"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                            <span>داگرتنی فایلەکە (.ts)</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Code Viewer Textarea */}
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={4}
                      value={cloudCodeTab === 'cloudCode' ? generatedCloudCode : generatedTsCode}
                      className="w-full p-2.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg border border-slate-700 focus:outline-none select-all overflow-x-auto"
                      dir="ltr"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>ئەم کۆدە هەموو مووچە، خەرجییەکان، ئامانجەکانی پاشەکەوت، زێڕ، و قەرزەکانت لەخۆدەگرێت. دەتوانیت لە خوارەوە یاخود لە هەر ئامێرێکی تر پەیستی بکەیتەوە بۆ دەستبەجێ بەردەوامبوون.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Action 2: Restore from Cloud Code */}
            <div className="pt-3 border-t border-indigo-100 dark:border-indigo-900/50 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>هاوردەکردن و دەستپێکردنەوە لە ڕێگەی کۆدی کڵاود:</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                ئەگەر کۆدی کڵاودت پێیە لە ئامێرێکی تر، لێرە دایبنێ بۆ ئەوەی داتاکانت بە تەواوی بگەڕێنەوە.
              </p>

              <div className="space-y-2">
                <textarea
                  rows={2}
                  value={inputCloudCode}
                  onChange={(e) => setInputCloudCode(e.target.value)}
                  placeholder="کۆدی کڵاود (XP_CLOUD_v2:... یان دەقی JSON) لێرە پەیست بکە..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  dir="ltr"
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestoreFromCloudCode}
                      disabled={!inputCloudCode.trim() || restoreCloudLoading}
                      className="py-2 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                    >
                      {restoreCloudLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>گەڕاندنەوە و کارکردن لە کڵاود</span>
                    </button>
                  </div>

                  {restoreCloudMsg && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>{restoreCloudMsg}</span>
                    </span>
                  )}
                  {restoreCloudError && (
                    <span className="text-xs text-red-500 font-bold flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{restoreCloudError}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset Defaults */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm">گەڕاندنەوە بۆ دۆخی بنەڕەتی</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              ئایا دڵنیایت لە گەڕاندنەوەی ڕێکخستنەکان؟ ڕێکخستنەکانی ڕووکار و زمان دەگەڕێنەوە سەر شێوازی سەرەتایی.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                پاشگەزبوونەوە
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetSettings) onResetSettings();
                  setShowResetConfirm(false);
                }}
                className="py-1.5 px-3.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
              >
                بەڵێ، بگەڕێنەوە
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button: Export All Data (Bottom Right Corner) */}
      <aside aria-label="Export All Data" className="fixed bottom-20 md:bottom-24 right-4 sm:right-6 z-30 flex flex-col items-end gap-2 pointer-events-auto">
        {/* Speed-dial / Quick format menu */}
        {showFabMenu && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 min-w-[230px] space-y-1 mb-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/80 mb-1 flex items-center justify-between">
              <span>هەڵبژاردنی جۆری فایل</span>
              <button
                type="button"
                onClick={() => setShowFabMenu(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleExportAll}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-teal-50 dark:hover:bg-teal-950/70 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">تەواوی داتاکان (JSON)</div>
                  <div className="text-[10px] text-slate-400 font-normal">کۆپی یەدەگ بۆ گەڕاندنەوە</div>
                </div>
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded-md font-bold">
                تەواو
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSVWithToast}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/70 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">ڕاپۆرتی دارایی (Excel)</div>
                  <div className="text-[10px] text-slate-400 font-normal">فایلی CSV بۆ ناو ئێکسڵ</div>
                </div>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-md font-bold">
                CSV
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportHTMLWithToast}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-teal-50 dark:hover:bg-teal-950/70 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">فایلی کارەکەم (HTML)</div>
                  <div className="text-[10px] text-slate-400 font-normal">پەڕگەی خۆبژێوی وێب و چاپکردن</div>
                </div>
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded-md font-bold">
                HTML
              </span>
            </button>
          </div>
        )}

        {/* Success toast notification */}
        {exportedToast && (
          <div className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-100" />
            <span>{exportedToast}</span>
          </div>
        )}

        {/* Main Floating Action Button */}
        <div className="flex items-center bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-600 text-white rounded-full shadow-xl shadow-teal-950/30 hover:shadow-2xl hover:shadow-teal-900/40 border border-white/25 transition-all duration-200 p-0.5 group">
          <button
            type="button"
            onClick={handleExportAll}
            className="flex items-center gap-2 py-2.5 ps-4 pe-3 font-extrabold text-xs sm:text-sm tracking-wide cursor-pointer transition-transform active:scale-95"
            title="Export All Data (هەناردەکردنی هەموو داتاکان)"
          >
            <Download className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:-translate-y-0.5 ${exportedSuccess ? 'animate-bounce text-emerald-200' : ''}`} />
            <span className="inline-flex items-center gap-1">
              {exportedSuccess ? (
                <>
                  <span>داگیرا</span>
                  <Check className="w-3.5 h-3.5" />
                </>
              ) : (
                'Export All Data'
              )}
            </span>
          </button>

          <div className="h-5 w-px bg-white/20" />

          <button
            type="button"
            onClick={() => setShowFabMenu(!showFabMenu)}
            aria-label="Export options"
            title="جۆری هەناردەکردن"
            className="p-2 sm:p-2.5 rounded-full hover:bg-white/15 transition cursor-pointer"
          >
            <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${showFabMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>
    </div>
  );
};
