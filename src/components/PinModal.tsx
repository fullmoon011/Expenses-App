import React, { useState, useEffect, useRef } from 'react';
import { KeyRound, X, Check, Fingerprint, ScanFace, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { sha256Hash } from '../utils/storage';
import { authenticateBiometric } from '../utils/biometrics';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storedPinHash?: string;
  biometricEnabled?: boolean;
  biometricCredId?: string;
  t: (key: string) => string;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storedPinHash,
  biometricEnabled = false,
  biometricCredId,
  t
}) => {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // Biometric state
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);
  const autoPromptRef = useRef(false);

  // Trigger biometric authentication
  const handleBiometricAuth = async () => {
    setBioLoading(true);
    setBioError(null);
    try {
      const res = await authenticateBiometric(biometricCredId);
      if (res.success) {
        setBioLoading(false);
        setPin('');
        setBioError(null);
        onSuccess();
      } else {
        setBioLoading(false);
        setBioError(res.error || 'نەتوانرا پەنجەمۆر یان ناسینەوەی دەموچاو تەواو بکرێت');
      }
    } catch (err: any) {
      setBioLoading(false);
      setBioError(err?.message || 'کێشەیەک ڕوویدا لە کاتی پشکنینی بایۆمەتری');
    }
  };

  // Auto prompt biometrics on modal open if enabled
  useEffect(() => {
    if (isOpen && biometricEnabled && !autoPromptRef.current) {
      autoPromptRef.current = true;
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 250);
      return () => clearTimeout(timer);
    }
    if (!isOpen) {
      autoPromptRef.current = false;
      setPin('');
      setPinError(false);
      setBioError(null);
      setBioLoading(false);
    }
  }, [isOpen, biometricEnabled]);

  if (!isOpen) return null;

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) return;

    setPinLoading(true);
    try {
      const hash = await sha256Hash(pin);
      if (hash === storedPinHash) {
        setPinError(false);
        setPin('');
        onSuccess();
      } else {
        setPinError(true);
      }
    } catch {
      setPinError(true);
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-base sm:text-lg">
            {biometricEnabled ? (
              <div className="flex items-center gap-1.5">
                <Fingerprint className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <span>کردنەوەی ئەپڵیکەیشن</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-5 h-5" />
                <span>{t('pin')}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Biometric Fast Unlock (Fingerprint / Face ID) */}
        {biometricEnabled && (
          <div className="p-4 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800/80 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-teal-700 dark:text-teal-300 font-semibold text-xs sm:text-sm">
              <ScanFace className="w-4 h-4 text-teal-600" />
              <span>پشکنینی پەنجەمۆر یان دەموچاو (Biometric)</span>
            </div>

            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={bioLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer ${
                bioLoading
                  ? 'bg-teal-700 text-white animate-pulse'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white active:scale-98'
              }`}
            >
              {bioLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>خوێندنەوەی پەنجەمۆر یان ناسینەوەی دەموچاو...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>{bioError ? 'دووبارە هەوڵبدەرەوە بە پەنجەمۆر' : 'کردنەوە بە پەنجەمۆر / Face ID'}</span>
                </>
              )}
            </button>

            {bioError && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{bioError}</span>
              </p>
            )}
          </div>
        )}

        {/* Divider if both Biometric and PIN exist */}
        {biometricEnabled && storedPinHash && (
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 dark:border-slate-700 w-full" />
            <span className="bg-white dark:bg-slate-800 px-3 text-[11px] text-slate-400 font-medium absolute">
              یان بە کۆدی نهێنی (PIN)
            </span>
          </div>
        )}

        {/* 2. PIN Entry Form */}
        {storedPinHash ? (
          <form onSubmit={handleVerifyPin} className="space-y-4 pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              {t('enp')}
            </p>

            <div>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoFocus={!biometricEnabled}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (pinError) setPinError(false);
                }}
                placeholder="••••"
                className="w-full text-center tracking-widest text-2xl font-bold py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-800 dark:text-slate-100"
              />
              {pinError && (
                <p className="text-red-500 text-xs mt-2 text-center font-medium">
                  {t('wr')}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pinLoading || pin.length < 4}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:scale-98 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{t('ok2')}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-xl transition cursor-pointer"
              >
                {t('rst')}
              </button>
            </div>
          </form>
        ) : (
          !biometricEnabled && (
            <div className="p-3 text-center text-xs text-slate-500">
              هیچ قفڵێکی نهێنی دانەنراوە
            </div>
          )
        )}
      </div>
    </div>
  );
};
