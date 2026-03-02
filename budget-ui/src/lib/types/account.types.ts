import type { EntityUser } from './index';

export type Account = {
	id: string;
	name: string;
	balance: number;
	accountType: AccountType;
	currencyCode: 'USD' | 'COP';
	user?: EntityUser;
};

export type AccountType = {
	id: string;
	name: string;
	accountCategory: string;
};

export type Currency = {
	code: string;
	name: string;
	symbol: string;
	flag: string;
	locale: string;
};

export type AccountSummary = {
	totalBalance: number;
	accountsCount: number;
	accountCategory: 'LIABILITY' | 'ASSET';
	currencyCode: 'USD' | 'COP';
};
