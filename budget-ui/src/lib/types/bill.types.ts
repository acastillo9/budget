import type { Account } from './account.types';
import type { Category } from './category.types';

export enum BillStatus {
	UPCOMING = 'UPCOMING',
	DUE = 'DUE',
	OVERDUE = 'OVERDUE',
	PAID = 'PAID'
}

export enum BillFrequency {
	NEVER = 'NEVER',
	DAILY = 'DAILY',
	WEEKLY = 'WEEKLY',
	BIWEEKLY = 'BIWEEKLY',
	MONTHLY = 'MONTHLY',
	ANNUALLY = 'ANNUALLY'
}

export type Bill = {
	id: string;
	name: string;
	amount: number;
	targetDate: string;
	dueDate: string;
	endDate?: string;
	status: BillStatus;
	frequency: BillFrequency;
	account: Account;
	category: Category;
	paidDate?: string;
	applyToFuture: boolean;
};
