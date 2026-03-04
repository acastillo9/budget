import type { EntityUser } from './index';
import type { Account } from './account.types';
import type { Category } from './category.types';

export type Attachment = {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	createdAt: string;
	updatedAt: string;
};

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
	user?: EntityUser;
	attachmentCount?: number;
};
