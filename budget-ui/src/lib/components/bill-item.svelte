<script lang="ts">
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { Check, Edit, Trash2, Undo2 } from '@lucide/svelte';
	import Button from './ui/button/button.svelte';
	import { t } from 'svelte-i18n';
	import { getUserContext } from '$lib/context';
	import { formatUTCStringDateWithLocal } from '$lib/utils/date';
	import { BillStatus, type Bill } from '$lib/types/bill.types';
	import { iconMap } from '$lib/utils/icons';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	type Props = {
		bill: Bill;
		isCurrentMonth?: boolean;
		isPaying?: boolean;
		isUnpaying?: boolean;
		pay?: (bill: Bill) => void;
		unpay?: (bill: Bill) => void;
		onEdit?: () => void;
		onDelete?: () => void;
	};

	let {
		bill,
		isCurrentMonth = true,
		isPaying = false,
		isUnpaying = false,
		pay = () => {},
		unpay = () => {},
		onEdit = () => {},
		onDelete = () => {}
	}: Props = $props();

	// Determine the color theme based on status and current month
	// Current month: UPCOMING uses yellow (same as DUE)
	// Other months: UPCOMING uses blue
	const useYellowForUpcoming = $derived(isCurrentMonth && bill.status === BillStatus.UPCOMING);
	// Use this for color lookups - maps UPCOMING to DUE when in current month
	const colorStatus = $derived(useYellowForUpcoming ? 'DUE' : bill.status);

	let daysDiff = $derived(
		Math.abs(
			Math.floor((new Date().getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24))
		)
	);

	let itemClasses = $derived.by(() => {
		let classes = 'flex items-center justify-between gap-4 rounded-lg border p-4 ';
		if (bill.status === BillStatus.OVERDUE) {
			classes += 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950';
		} else if (bill.status === BillStatus.DUE || useYellowForUpcoming) {
			classes += 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950';
		} else if (bill.status === BillStatus.UPCOMING) {
			classes += 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950';
		} else {
			classes += 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950';
		}
		return classes;
	});

	const userState = getUserContext();

	const Icon = $derived(iconMap[bill.category.icon as keyof typeof iconMap]);
</script>

<div class={itemClasses}>
	<div class="flex w-full items-center gap-4">
		{#if bill.status === 'OVERDUE'}
			<div class="rounded-full bg-red-100 p-2 dark:bg-red-900">
				<Icon class="h-4 w-4 text-red-600" />
			</div>
		{:else if bill.status === 'DUE' || useYellowForUpcoming}
			<div class="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900">
				<Icon class="h-4 w-4 text-yellow-600" />
			</div>
		{:else if bill.status === 'UPCOMING'}
			<div class="rounded-full bg-blue-100 p-2 dark:bg-blue-900">
				<Icon class="h-4 w-4 text-blue-600" />
			</div>
		{:else}
			<div class="rounded-full bg-green-100 p-2 dark:bg-green-900">
				<Icon class="h-4 w-4 text-green-600" />
			</div>
		{/if}
		<div
			class="flex w-full flex-col items-start gap-2 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex-flex-col-gap-1">
				<div>
					<p
						class={`font-medium ${
							{
								OVERDUE: 'text-red-900 dark:text-red-100',
								DUE: 'text-yellow-900 dark:text-yellow-100',
								UPCOMING: 'text-blue-900 dark:text-blue-100',
								PAID: 'text-green-900 dark:text-green-100'
							}[colorStatus]
						}`}
					>
						{bill.name}
					</p>
					<div
						class={`flex flex-wrap items-center gap-2 text-xs ${
							{
								OVERDUE: 'text-red-700 dark:text-red-300',
								DUE: 'text-yellow-700 dark:text-yellow-300',
								UPCOMING: 'text-blue-700 dark:text-blue-300',
								PAID: 'text-green-700 dark:text-green-300'
							}[colorStatus]
						}`}
					>
						<span>{bill.account.name}</span>
						<span>
							<span>•</span>
							<span>{bill.category.name}</span>
						</span>
						<span>
							<span>•</span>
							<span
								>{$t('bills.dueDateText', {
									values: {
										date: formatUTCStringDateWithLocal(bill.dueDate)
									}
								})}</span
							>
						</span>
						{#if bill.status === 'OVERDUE'}
							<span>
								<span>•</span>
								<span class="font-medium">
									{$t('bills.daysOverdue', {
										values: { count: daysDiff }
									})}
								</span>
							</span>
						{:else if bill.status === 'DUE' || bill.status === 'UPCOMING'}
							<span>
								<span>•</span>
								<span class="font-medium">
									{$t('bills.daysLeft', {
										values: { count: daysDiff }
									})}
								</span>
							</span>
						{:else}
							<span>
								<span>•</span>
								<span class="font-medium">
									{$t('bills.paidOn', {
										values: { date: formatUTCStringDateWithLocal(bill.paidDate!) }
									})}
								</span>
							</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="md:text-right">
				<p
					class={`font-semibold ${
						{
							OVERDUE: 'text-red-900 dark:text-red-100',
							DUE: 'text-yellow-900 dark:text-yellow-100',
							UPCOMING: 'text-blue-900 dark:text-blue-100',
							PAID: 'text-green-900 dark:text-green-100'
						}[colorStatus]
					}`}
				>
					{#if bill.account.currencyCode !== userState.user?.currencyCode}
						{bill.account.currencyCode}
					{/if}
					{formatCurrencyWithSymbol(bill.amount, bill.account.currencyCode)}
				</p>
				{#if bill.account.currencyCode !== userState.user?.currencyCode}
					<p
						class={`mt-1 text-xs ${
							{
								OVERDUE: 'text-red-700 dark:text-red-300',
								DUE: 'text-yellow-700 dark:text-yellow-300',
								UPCOMING: 'text-blue-700 dark:text-blue-300',
								PAID: 'text-green-700 dark:text-green-300'
							}[colorStatus]
						}`}
					>
						≈ {userState.user?.currencyCode || 'USD'}
						{formatCurrencyWithSymbol(
							bill.amount / (userState.currencyRates?.rates[bill.account.currencyCode]?.rate || 1),
							userState.user?.currencyCode || 'USD'
						)}
					</p>
				{/if}
				<p
					class={`text-xs ${
						{
							OVERDUE: 'text-red-700 dark:text-red-300',
							DUE: 'text-yellow-700 dark:text-yellow-300',
							UPCOMING: 'text-blue-700 dark:text-blue-300',
							PAID: 'text-green-700 dark:text-green-300'
						}[colorStatus]
					}`}
				>
					{$t(`bills.billFrequency.${bill.frequency}`)}
				</p>
			</div>
		</div>
	</div>
	<div class="flex items-center gap-3">
		<div class="flex items-center gap-2">
			{#if bill.status !== BillStatus.PAID}
				<Button
					variant={bill.status === BillStatus.OVERDUE ? 'destructive' : 'default'}
					size="sm"
					disabled={isPaying}
					onclick={() => pay(bill)}
				>
					{#if isPaying}<LoaderCircle class="mr-1 animate-spin" />{/if}
					<Check class="mr-1 h-3 w-3" />
					{$t('bills.payNow')}
				</Button>
			{:else}
				<Button variant="default" size="sm" disabled={isUnpaying} onclick={() => unpay(bill)}>
					{#if isUnpaying}<LoaderCircle class="mr-1 animate-spin" />{/if}
					<Undo2 className="h-3 w-3" />
					{$t('bills.unpay')}
				</Button>
			{/if}
			<Button variant="ghost" size="icon" onclick={onEdit}>
				<Edit class="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon"
				onclick={onDelete}
				class="text-destructive hover:text-destructive"
			>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>
	</div>
</div>
