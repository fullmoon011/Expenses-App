import { CurrencyType } from '../types';

export interface CurrencyMeta {
  code: CurrencyType;
  symbol: string;
  iso: string;
  nameKu: string;
  nameEn: string;
  defaultRateInIqd: number;
}

export const GLOBAL_CURRENCIES: CurrencyMeta[] = [
  { code: 'D', symbol: 'د.ع', iso: 'IQD', nameKu: 'دیناری عێراقی', nameEn: 'Iraqi Dinar', defaultRateInIqd: 1 },
  { code: 'U', symbol: '$', iso: 'USD', nameKu: 'دۆلاری ئەمریکی', nameEn: 'US Dollar', defaultRateInIqd: 1500 },
  { code: 'E', symbol: '€', iso: 'EUR', nameKu: 'یۆرۆ', nameEn: 'Euro', defaultRateInIqd: 1620 },
  { code: 'G', symbol: '£', iso: 'GBP', nameKu: 'پاوەندی بەریتانی', nameEn: 'British Pound', defaultRateInIqd: 1900 },
  { code: 'T', symbol: '₺', iso: 'TRY', nameKu: 'لیرەی تورکی', nameEn: 'Turkish Lira', defaultRateInIqd: 44 },
  { code: 'S', symbol: 'ر.س', iso: 'SAR', nameKu: 'ڕیاڵی سعودی', nameEn: 'Saudi Riyal', defaultRateInIqd: 400 },
  { code: 'R', symbol: 'تومان', iso: 'IRR', nameKu: 'تمەنی ئێرانی', nameEn: 'Iranian Rial', defaultRateInIqd: 0.025 },
];

export function getCurrencySymbol(cu?: CurrencyType): string {
  return GLOBAL_CURRENCIES.find((c) => c.code === cu)?.symbol || 'د.ع';
}

export async function fetchLiveGlobalFxRates(usdToIqd: number): Promise<Record<string, number>> {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error('Failed to fetch live FX rates');
  const data = await res.json();
  const rates = data?.rates || {};

  const out: Record<string, number> = {};
  if (rates.EUR) out.E = Math.round(usdToIqd / rates.EUR);
  if (rates.GBP) out.G = Math.round(usdToIqd / rates.GBP);
  if (rates.TRY) out.T = Math.round((usdToIqd / rates.TRY) * 10) / 10;
  if (rates.SAR) out.S = Math.round(usdToIqd / rates.SAR);
  if (rates.IRR) out.R = Math.round((usdToIqd / rates.IRR) * 1000) / 1000;
  return out;
}
