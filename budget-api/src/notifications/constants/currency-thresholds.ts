import { CurrencyCode } from 'src/shared/entities/currency-code.enum';

export const CURRENCY_THRESHOLD_DEFAULTS: Record<
  CurrencyCode,
  { largeTransactionAmount: number; lowBalanceAmount: number }
> = {
  [CurrencyCode.USD]: { largeTransactionAmount: 500, lowBalanceAmount: 100 },
  [CurrencyCode.COP]: {
    largeTransactionAmount: 2000000,
    lowBalanceAmount: 500000,
  },
};

export function getThresholdForCurrency(
  thresholdsMap: Record<string, number> | undefined,
  currencyCode: CurrencyCode,
  field: 'largeTransactionAmount' | 'lowBalanceAmount',
): number {
  const value = thresholdsMap?.[currencyCode];
  if (value !== undefined) return value;
  return (
    CURRENCY_THRESHOLD_DEFAULTS[currencyCode]?.[field] ??
    CURRENCY_THRESHOLD_DEFAULTS[CurrencyCode.USD][field]
  );
}
