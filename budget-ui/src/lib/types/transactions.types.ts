import type { Account } from './account.types';
import type { Category } from './category.types';

export type Transaction = {
	id: string;
	date: string;
	amount: number;
	description: string;
	notes: string;
	createdAt: string;
	updatedAt: string;
	isTransfer: boolean;
	category: Category;
	account: Account;
	transfer: Transaction;
};
