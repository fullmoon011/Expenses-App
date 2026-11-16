import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, X, Check, AlertCircle, Volume2 } from 'lucide-react';
import { ExpenseTx } from '../types';
import { CATEGORIES, getCategoryName } from '../constants/categories';
import { CategoryIcon } from './CategoryIcon';
import { fmt } from '../utils/calculations';

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (tx: ExpenseTx, repeatMonthly: boolean) => void;
  langIndex: number;
  currentMonth: string;
  defaultRate: number;
}

export const VoiceExpenseModal: React.FC<VoiceExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
  langIndex,
  currentMonth,
  defaultRate,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    total: number;
    currency: 'D' | 'U';
    category: number;
    note: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setIsListening(false);
      setTranscript('');
      setParsedResult(null);
      setErrorMessage('');
      return;
    }

    startListening();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isOpen]);

  const startListening = () => {
    setErrorMessage('');
    setParsedResult(null);
    setTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage('تایبەتمەندی دەنگ لەم وێبگەڕەدا بەردەست نییە. دەتوانیت دەقەکە لە خوارەوە بنووسیت.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      // Try Kurdish first, fallback to Arabic (Iraq) which is broadly supported in Android/iOS/Chrome
      recognition.lang = 'ckb-IQ';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          setErrorMessage('هیچ دەنگێک نەبیسترا. تکایە دووبارە تاقی بکەرەوە.');
        } else if (event.error === 'language-not-supported') {
          // Fallback to Arabic (Iraq)
          recognition.lang = 'ar-IQ';
          try {
            recognition.start();
            return;
          } catch (e) {
            setErrorMessage('تکایە بە ڕوونی قسە بکە.');
          }
        } else {
          setErrorMessage('هەڵەیەک ڕوویدا لە کاتی وەرگرتنی دەنگدا.');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      setErrorMessage('نەتوانرا مایکرۆفۆن کارپێبکرێت.');
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    if (transcript.trim()) {
      handleParseText(transcript.trim());
    }
  };

  // Parse text via server API or local rules
  const handleParseText = async (textToParse: string) => {
    if (!textToParse) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/parse-quick-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToParse }),
      });

      if (!res.ok) throw new Error('API parse failed');
      const data = await res.json();

      if (data.total && +data.total > 0) {
        setParsedResult({
          total: +data.total,
          currency: data.currency === 'USD' ? 'U' : 'D',
          category: data.category >= 0 && data.category < CATEGORIES.length ? data.category : 6,
          note: data.note || textToParse,
        });
      } else {
        // Fallback local Kurdish regex parsing
        parseLocalKurdish(textToParse);
      }
    } catch (err) {
      console.warn('Server parse failed, using local rules:', err);
      parseLocalKurdish(textToParse);
    } finally {
      setIsProcessing(false);
    }
  };

  // Local fallback parsing for common Kurdish phrases
  const parseLocalKurdish = (text: string) => {
    const lower = text.toLowerCase();
    let detectedAmount = 0;
    let detectedCat = 6; // default groceries
    let detectedCurrency: 'D' | 'U' = 'D';

    // Check for thousands
    const numMatch = lower.match(/(\d+)/);
    if (numMatch) {
      let val = parseInt(numMatch[1], 10);
      if (lower.includes('هەزار') || lower.includes('hezar') || lower.includes('k')) {
        if (val < 1000) val *= 1000;
      }
      detectedAmount = val;
    } else if (lower.includes('پێنج هەزار')) {
      detectedAmount = 5000;
    } else if (lower.includes('دە هەزار') || lower.includes('دا هەزار')) {
      detectedAmount = 10000;
    } else if (lower.includes('بیست و پێنج هەزار')) {
      detectedAmount = 25000;
    } else if (lower.includes('پەنجا هەزار')) {
      detectedAmount = 50000;
    } else if (lower.includes('هەزار')) {
      detectedAmount = 1000;
    }

    if (lower.includes('دۆلار') || lower.includes('$')) {
      detectedCurrency = 'U';
    }

    // Category detection
    if (lower.includes('تەکسی') || lower.includes('تاکسی') || lower.includes('هاتوچۆ')) {
      detectedCat = 10; // Taxi
    } else if (lower.includes('بەنزین') || lower.includes('گاز')) {
      detectedCat = 8; // Fuel
    } else if (lower.includes('نان') || lower.includes('نانەوا') || lower.includes('سەمون')) {
      detectedCat = 6; // Bread/Groceries
    } else if (lower.includes('قاوە') || lower.includes('چای') || lower.includes('کافێ')) {
      detectedCat = 16; // Cafe
    } else if (lower.includes('دکتۆر') || lower.includes('دەرمان') || lower.includes('نەخۆش')) {
      detectedCat = 11; // Medical
    } else if (lower.includes('ئینتەرنێت') || lower.includes('باڵانس') || lower.includes('کارت')) {
      detectedCat = 4; // Internet
    }

    if (detectedAmount > 0) {
      setParsedResult({
        total: detectedAmount,
        currency: detectedCurrency,
        category: detectedCat,
        note: text,
      });
    } else {
      setErrorMessage('بڕی خەرجی دەستنیشان نەکرا. تکایە بە ڕوونی بڵێ: «٥ هەزار تەکسی».');
    }
  };

  const handleConfirmAdd = () => {
    if (!parsedResult) return;
    const today = new Date().toISOString().slice(0, 10);
    const tx: ExpenseTx = {
      c: parsedResult.category,
      d: today.startsWith(currentMonth) ? today : `${currentMonth}-01`,
      a: parsedResult.total,
      cu: parsedResult.currency,
      r: defaultRate,
      w: 0,
      s: 0,
      n: parsedResult.note,
    };
    onAddExpense(tx, false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl relative text-center pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 start-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 mb-2 flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>تۆمارکردنی دەنگی خێرا</span>
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          بە کوردی بڵێ، بۆ نموونە: <b className="text-slate-700 dark:text-slate-200">«٥ هەزار تەکسی»</b> یان{' '}
          <b className="text-slate-700 dark:text-slate-200">«٢٥ هەزار مارکێت»</b>
        </p>

        {/* Pulsing Microphone Button */}
        <div className="relative my-6 flex items-center justify-center">
          {isListening && (
            <>
              <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="absolute w-24 h-24 rounded-full bg-emerald-500/30 animate-pulse" />
            </>
          )}

          <button
            type="button"
            onClick={isListening ? handleStopListening : startListening}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform active:scale-95 cursor-pointer ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
            }`}
          >
            {isListening ? (
              <Mic className="w-8 h-8 animate-pulse" />
            ) : (
              <MicOff className="w-8 h-8 opacity-80" />
            )}
          </button>
        </div>

        {/* Live Status or Transcript */}
        <div className="min-h-[56px] flex flex-col items-center justify-center my-3">
          {isListening ? (
            <div className="space-y-1">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center justify-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>گوێم لە دەنگتە... قسە بکە</span>
              </span>
              {transcript && (
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  «{transcript}»
                </p>
              )}
            </div>
          ) : isProcessing ? (
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 animate-pulse">
              شیکردنەوەی خەرجییەکە...
            </span>
          ) : transcript ? (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              وتت: <b className="text-slate-900 dark:text-white">«{transcript}»</b>
            </p>
          ) : (
            <span className="text-xs text-slate-400">کلیک لە مایکرۆفۆنەکە بکە بۆ دەستپێکردن</span>
          )}

          {errorMessage && (
            <p className="text-xs text-red-500 font-semibold mt-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>

        {/* Detected Result Preview Card */}
        {parsedResult && (
          <div className="my-4 p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 text-start animate-in zoom-in-95 duration-150">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
              خەرجی ناسراوە:
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <CategoryIcon
                    name={CATEGORIES[parsedResult.category]?.icon}
                    className="w-4 h-4"
                  />
                </div>
                <div>
                  <b className="text-xs font-bold text-slate-900 dark:text-white block">
                    {getCategoryName(parsedResult.category, langIndex)}
                  </b>
                  <span className="text-[11px] text-slate-500 truncate block max-w-[150px]">
                    {parsedResult.note}
                  </span>
                </div>
              </div>
              <div className="text-end">
                <b className="text-base font-black text-emerald-800 dark:text-emerald-200">
                  {fmt(parsedResult.total)}
                </b>
                <span className="text-[10px] text-slate-500 ms-1">
                  {parsedResult.currency === 'U' ? '$' : 'د.ع'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmAdd}
              className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>پەسەندکردن و تۆمارکردن</span>
            </button>
          </div>
        )}

        {/* Manual Fallback Text Input */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleParseText(transcript)}
            placeholder="یان لێرە بنووسە: ٥ هەزار تەکسی..."
            className="flex-1 py-2 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => handleParseText(transcript)}
            disabled={!transcript.trim() || isProcessing}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ناردن
          </button>
        </div>
      </div>
    </div>
  );
};
