import type { Currency } from '$lib/types/account.types';
import { $t } from '$lib/i18n';

export const currencies: Currency[] = [
	{
		code: 'COP',
		name: $t('currencies.COP'),
		symbol: '$',
		flag: '🇨🇴',
		locale: 'es-CO'
	},
	{
		code: 'USD',
		name: $t('currencies.USD'),
		symbol: '$',
		flag: '🇺🇸',
		locale: 'en-US'
	}
];

export function getCurrencyByCode(code: string): Currency | undefined {
	return currencies.find((currency) => currency.code === code);
}

export function formatCurrencyWithSymbol(amount: number, currencyCode: string): string {
	const currency = getCurrencyByCode(currencyCode);
	if (!currency) return amount.toString();

	const formatter = new Intl.NumberFormat(currency.locale, {
		style: 'currency',
		currency: currencyCode,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2
	});

	return formatter.format(amount);
}
