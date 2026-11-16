import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Briefcase,
  Home,
  Store,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Smartphone,
  Download,
  X,
  Settings,
  Cloud,
  Bell,
  FileText,
  Sparkles
} from 'lucide-react';
import { SmartNotification, requestBrowserNotifications } from '../utils/notifications';
import { NamesConfig, SettingsConfig, WorkspaceAccount } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { shiftMonth } from '../utils/calculations';

interface HeaderProps {
  t: (key: string) => string;
  isLocked: boolean;
  onToggleLock: () => void;
  currentMonth: string;
  onChangeMonth: (m: string) => void;
  names: NamesConfig;
  settings: SettingsConfig;
  onSwitchWorkspace: (id: string) => void;
  onAddWorkspace: (name: string, icon: string) => void;
  activeTab?: string;
  onOpenSettings?: () => void;
  isCloudConnected?: boolean;
  onOpenCloudSync?: () => void;
  notifications?: SmartNotification[];
  onOpenPdfReport?: () => void;
  onOpenAiAdvisor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  t,
  isLocked,
  onToggleLock,
  currentMonth,
  onChangeMonth,
  names,
  settings,
  onSwitchWorkspace,
  onAddWorkspace,
  activeTab = 'expenses',
  onOpenSettings,
  isCloudConnected = false,
  onOpenCloudSync,
  notifications = [],
  onOpenPdfReport,
  onOpenAiAdvisor
}) => {
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [showIosModal, setShowIosModal] = useState(false);

  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }
    await promptInstall();
  };

  const currentWsId = settings.acc || '';
  const currentWs = (names.accs || []).find(a => a.id === currentWsId) || {
    id: '',
    n: names.mn || t('wsm'),
    i: names.mi || 'house'
  };

  const handleAdd = () => {
    if (!newWsName.trim()) return;
    onAddWorkspace(newWsName.trim(), 'briefcase');
    setNewWsName('');
    setShowWorkspaceMenu(false);
  };

  return (
    <header
      className={`relative rounded-3xl p-3.5 sm:p-4 mb-5 transition-all border ${
        settings.ui?.hg === 0
          ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
          : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Workspace */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-teal-800 flex items-center justify-center p-2 shadow-sm shadow-teal-900/20 text-white">
            <svg viewBox="0 0 40 40" className="w-full h-full fill-white" aria-hidden="true">
              <rect x="7" y="22" width="6" height="12" rx="2" fill="white" />
              <rect x="17" y="15" width="6" height="19" rx="2" fill="white" />
              <rect x="27" y="8" width="6" height="26" rx="2" fill="white" />
              <circle cx="12" cy="10" r="5" fill="#fcd34d" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                {t('app')}
              </h1>
            </div>
            {/* Workspace trigger */}
            <button
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              className="flex items-center gap-1.5 text-xs text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-white bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-2.5 py-0.5 rounded-lg border border-teal-200/60 dark:border-teal-800/60 transition mt-0.5 cursor-pointer"
            >
              <CategoryIcon name={currentWs.i} className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span className="font-semibold truncate max-w-[120px]">{currentWs.n}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Apple-style Month Selector Segment */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-2xl p-1 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonth(currentMonth, -1))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title={t('prev_month')}
            >
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => e.target.value && onChangeMonth(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white text-xs md:text-sm font-bold focus:outline-none cursor-pointer px-1.5 text-center"
            />
            <button
              type="button"
              onClick={() => onChangeMonth(shiftMonth(currentMonth, 1))}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              title={t('next_month')}
            >
              <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180" />
            </button>
          </div>

          {/* AI Financial Advisor Button */}
          {onOpenAiAdvisor && (
            <button
              type="button"
              onClick={onOpenAiAdvisor}
              title="ڕاوێژکاری دارایی زیرەک (AI)"
              className="p-2.5 rounded-2xl border bg-gradient-to-tr from-teal-500/15 to-indigo-500/15 text-teal-700 dark:text-teal-300 border-teal-300/60 dark:border-teal-700/60 hover:from-teal-500/25 hover:to-indigo-500/25 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </button>
          )}

          {/* Smart Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              title="ئاگادارکردنەوە زیرەکەکان"
              className="p-2.5 rounded-2xl border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-2xs relative"
            >
              <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute top-full mt-2 end-0 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    ئاگادارکردنەوە زیرەکەکان 🔔
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await requestBrowserNotifications();
                    }}
                    className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    چالاککردنی ئاگادارکردنەوەی مۆبایل
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="text-center py-5 text-xs text-slate-400">
                    هیچ ئاگادارکردنەوەیەکی نوێ نییە 🌿
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-xl border text-xs transition ${
                          n.type === 'budget' && n.urgent
                            ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/60'
                            : n.urgent
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {n.title}
                          </span>
                          {n.percentage !== undefined && (
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                              n.percentage >= 100
                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                            }`}>
                              %{Math.round(n.percentage)}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {n.body}
                        </div>
                        {n.percentage !== undefined && (
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                n.percentage >= 100 ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, n.percentage)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy Eye Button */}
          <button
            onClick={onToggleLock}
            title={isLocked ? t('enp') : t('locked')}
            className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs ${
              isLocked
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/80 hover:bg-amber-100'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700'
            }`}
          >
            {isLocked ? (
              <EyeOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          {/* Unified Quick Menu (Cloud Sync, PDF Report, Settings) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title={t('nt') || 'ڕێکخستن'}
              aria-label={t('nt') || 'ڕێکخستن'}
              className={`p-2.5 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs relative ${
                activeTab === 'settings' || showMoreMenu
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              {isCloudConnected && (
                <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {showMoreMenu && (
              <div className="absolute top-full mt-2 end-0 z-50 w-60 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                {onOpenCloudSync && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenCloudSync();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Cloud className={`w-4 h-4 ${isCloudConnected ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span>پاشەکەوتی هەوری (Cloud)</span>
                    </span>
                    {isCloudConnected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">
                        چالاک
                      </span>
                    )}
                  </button>
                )}

                {onOpenPdfReport && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenPdfReport();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>ڕاپۆرتی PDF و Excel</span>
                  </button>
                )}

                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenSettings();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>{t('nt') || 'ڕێکخستنە گشتییەکان'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workspace Menu Dropdown */}
      {showWorkspaceMenu && (
        <div className="absolute top-full mt-2 inset-x-4 md:inset-x-auto md:start-4 z-40 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 min-w-[260px] animate-in fade-in zoom-in-95 duration-150">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
            {t('wsp')}
          </div>

          <div className="space-y-1 mb-3">
            {/* Main default */}
            <button
              onClick={() => {
                onSwitchWorkspace('');
                setShowWorkspaceMenu(false);
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-sm transition ${
                currentWsId === ''
                  ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CategoryIcon name={names.mi || 'house'} className="w-4 h-4 text-teal-600" />
                <span>{names.mn || t('wsm')}</span>
              </div>
              {currentWsId === '' && <Check className="w-4 h-4 text-teal-600" />}
            </button>

            {/* Custom workspaces */}
            {(names.accs || []).map((acc) => (
              <button
                key={acc.id}
                onClick={() => {
                  onSwitchWorkspace(acc.id);
                  setShowWorkspaceMenu(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-sm transition ${
                  currentWsId === acc.id
                    ? 'bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-semibold'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CategoryIcon name={acc.i || 'briefcase'} className="w-4 h-4 text-teal-600" />
                  <span>{acc.n}</span>
                </div>
                {currentWsId === acc.id && <Check className="w-4 h-4 text-teal-600" />}
              </button>
            ))}
          </div>

          {/* Add new workspace input */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder={t('wsn')}
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="flex-1 text-xs py-1.5 px-2.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
              />
              <button
                onClick={handleAdd}
                className="p-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
