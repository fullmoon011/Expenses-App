import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  X,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Users,
  Globe
} from 'lucide-react';
import {
  signInWithGoogle,
  signOutUser,
  saveCloudBackup,
  listUserCloudBackups,
  pushSharedFamilyWorkspace,
  subscribeSharedFamilyWorkspace,
  CloudBackupRecord
} from '../firebase';
import { fetchLiveGlobalFxRates } from '../utils/currencies';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  workspaceId: string;
  workspaceName: string;
  usdRate?: number;
  onUpdateFxRates?: (rates: Record<string, number>) => void;
  onOpenPrivacyPolicy?: () => void;
  getFullBackupPayload: () => unknown;
  onRestoreBackup: (payload: unknown) => Promise<void>;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  workspaceId,
  workspaceName,
  usdRate = 1500,
  onUpdateFxRates,
  onOpenPrivacyPolicy,
  getFullBackupPayload,
  onRestoreBackup
}) => {
  const [backups, setBackups] = useState<CloudBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [familyCode, setFamilyCode] = useState<string>(() => localStorage.getItem('family_sync_code') || '');
  const [isFamilyLive, setIsFamilyLive] = useState<boolean>(false);

  const fetchBackups = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const list = await listUserCloudBackups();
      setBackups(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'هەڵەیەک ڕوویدا لە هێنانی پاشەکەوتەکان');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchBackups();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      setStatusMsg('بە سەرکەوتوویی چوویتە ژوورەوە!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'نەتوانرا بچیتە ژوورەوە');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupNow = async () => {
    if (!user) return;
    setIsLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const backupId = `${user.uid}_${workspaceId || 'main'}`;
      await saveCloudBackup(backupId, workspaceName, getFullBackupPayload());
      setStatusMsg('هەموو زانیارییەکان بە سەرکەوتوویی لە هەور پاشەکەوت کران');
      await fetchBackups();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'هەڵە لە پاشەکەوتکردن');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (record: CloudBackupRecord) => {
    setIsLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const parsed = JSON.parse(record.payload);
      await onRestoreBackup(parsed);
      setStatusMsg(`پاشەکەوتی "${record.workspaceName}" بە سەرکەوتوویی گەڕێندرایەوە`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'هەڵە لە گەڕاندنەوەی زانیارییەکان');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                پاشەکەوتی هەوری (Cloud Sync)
              </h3>
              <span className="text-[11px] text-slate-400">
                پاراستنی زانیارییەکانت لەسەر هەژماری گووگڵ
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

        {/* Status / Error Alerts */}
        {statusMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!user ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <CloudOff className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                هەژمارەکەت ببەستەرەوە بە گووگڵ
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                بە چوونەژوورەوە لە ڕێگەی گووگڵ، هەموو خەرجی، بودجە و قەرزەکانت بە شێوەیەکی پارێزراو لە هەور پاشەکەوت دەبن و لە هەر مۆبایلێکەوە دەتوانیت بیانگەڕێنیتەوە.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'چاوەڕوان بە...' : 'چوونەژوورەوە بە هەژماری گووگڵ'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Connected User Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-10 h-10 rounded-full border border-teal-500/30 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center shrink-0">
                    {(user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user.displayName || 'بەکارهێنەر'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signOutUser()}
                title="چوونەدەرەوە"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Backup Now Button */}
            <button
              type="button"
              onClick={handleBackupNow}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isLoading ? 'خەریکە پاشەکەوت دەبێت...' : 'پاشەکەوتکردنی ئێستا لە هەور'}</span>
            </button>

            {/* Saved Backups List */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  پاشەکەوتە هەڵگیراوەکان
                </span>
                <button
                  type="button"
                  onClick={fetchBackups}
                  disabled={isLoading}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>نوێکردنەوە</span>
                </button>
              </div>

              {backups.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                  هێشتا هیچ پاشەکەوتێکت لە هەور نییە
                </div>
              ) : (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {backups.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {b.workspaceName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {b.id}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestore(b)}
                        disabled={isLoading}
                        className="py-1.5 px-3 bg-white dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                      >
                        <DownloadCloud className="w-3.5 h-3.5" />
                        <span>گەڕاندنەوە</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Family Real-Time Sync Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>هاوبەشکردنی ڕاستەوخۆی خێزان (Family Live Sync)</span>
                </span>
                {isFamilyLive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold">
                    چالاکە ●
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  placeholder="کۆدی خێزان (نموونە: FAM2026)"
                  className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={isLoading || familyCode.trim().length < 4}
                  onClick={async () => {
                    setIsLoading(true);
                    setErrorMsg(null);
                    try {
                      localStorage.setItem('family_sync_code', familyCode.trim());
                      await pushSharedFamilyWorkspace(familyCode.trim(), workspaceName, getFullBackupPayload());
                      subscribeSharedFamilyWorkspace(familyCode.trim(), async (payload) => {
                        await onRestoreBackup(payload);
                      });
                      setIsFamilyLive(true);
                      setStatusMsg(`هاوبەشکردنی خێزان بە کۆدی ${familyCode.trim()} چالاک کرا!`);
                    } catch (err) {
                      setErrorMsg(err instanceof Error ? err.message : 'هەڵە لە هاوبەشکردنی خێزان');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer shrink-0"
                >
                  بەستنەوە
                </button>
              </div>
            </div>

            {/* Live Global FX Rates */}
            {onUpdateFxRates && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={async () => {
                    setIsLoading(true);
                    setErrorMsg(null);
                    try {
                      const rates = await fetchLiveGlobalFxRates(usdRate);
                      onUpdateFxRates(rates);
                      setStatusMsg('نرخی دراوە جیهانییەکان (EUR, GBP, TRY, SAR, IRR) نوێکرایەوە');
                    } catch {
                      setErrorMsg('نەتوانرا نرخی دراوەکان لە ئینتەرنێت بهێنرێت');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>نوێکردنەوەی نرخی دراوە جیهانییەکان (Live FX)</span>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>پارێزراوە بە Firebase</span>
              </span>
              {onOpenPrivacyPolicy && (
                <button
                  type="button"
                  onClick={onOpenPrivacyPolicy}
                  className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                >
                  سیاسەتی پاراستنی نهێنی
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
