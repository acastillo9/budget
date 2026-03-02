import type { EntityUser } from './index';
import type { Category } from './category.types';

export enum BudgetPeriod {
	WEEKLY = 'WEEKLY',
	MONTHLY = 'MONTHLY',
	YEARLY = 'YEARLY'
}

export type Budget = {
	id: string;
	name?: string;
	amount: number;
	period: BudgetPeriod;
	startDate: string;
	endDate?: string;
	categories: Category[];
	user?: EntityUser;
};

export type BudgetProgress = {
	budgetId: string;
	name: string;
	amount: number;
	period: BudgetPeriod;
	periodStart: string;
	periodEnd: string;
	spent: number;
	remaining: number;
	percentUsed: number;
	categories: Category[];
	user?: EntityUser;
};
