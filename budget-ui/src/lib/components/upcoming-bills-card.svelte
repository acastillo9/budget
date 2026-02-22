<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from 'svelte-i18n';
	import { BillStatus, type Bill } from '$lib/types/bill.types';
	import { Receipt, AlertTriangle, Clock, CheckCircle, Check } from '@lucide/svelte';
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { iconMap } from '$lib/utils/icons';
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';

	interface Props {
		bills: Bill[];
	}

	let { bills }: Props = $props();

	let payingBillId: string | undefined = $state(undefined);

	async function payBill(bill: Bill) {
		payingBillId = bill.id;
		const targetDate = bill.targetDate || bill.dueDate;
		try {
			const response = await fetch(`/api/bills/${bill.id}/${targetDate.split('T')[0]}/pay`, {
				method: 'POST',
				body: JSON.stringify({
					paidDate: new Date().toISOString().split('T')[0]
				})
			});

			if (!response.ok) {
				throw new Error('Failed to pay bill');
			}

			toast.success($t('bills.billPaidSuccess'));
			invalidateAll();
		} catch {
			toast.error($t('bills.billPaidError'));
		} finally {
			payingBillId = undefined;
		}
	}

	// Filter to show only unpaid bills (overdue, due, upcoming) sorted by due date
	let unpaidBills = $derived(
		bills
			.filter((bill) => bill.status !== BillStatus.PAID)
			.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
	);

	function getDaysInfo(bill: Bill) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dueDate = new Date(bill.dueDate);
		dueDate.setHours(0, 0, 0, 0);
		const diffTime = dueDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	}

	// Use yellow/warning color for both DUE and UPCOMING since this is current month
	function getStatusColor(status: BillStatus) {
		switch (status) {
			case BillStatus.OVERDUE:
				return 'text-red-600 dark:text-red-400';
			case BillStatus.DUE:
			case BillStatus.UPCOMING:
				return 'text-yellow-600 dark:text-yellow-400';
			default:
				return 'text-green-600 dark:text-green-400';
		}
	}

	function getStatusBgColor(status: BillStatus) {
		switch (status) {
			case BillStatus.OVERDUE:
				return 'bg-red-100 dark:bg-red-900';
			case BillStatus.DUE:
			case BillStatus.UPCOMING:
				return 'bg-yellow-100 dark:bg-yellow-900';
			default:
				return 'bg-green-100 dark:bg-green-900';
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<div>
			<Card.Title>{$t('dashboard.upcomingBills')}</Card.Title>
			<Card.Description>{$t('dashboard.upcomingBillsDescription')}</Card.Description>
		</div>
		<Button variant="ghost" size="sm" onclick={() => goto('/bills')}>
			{$t('dashboard.viewAll')}
		</Button>
	</Card.Header>
	<Card.Content>
		{#if unpaidBills.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<CheckCircle class="mx-auto mb-4 h-12 w-12 text-green-500 opacity-50" />
				<p>{$t('dashboard.noPendingBills')}</p>
			</div>
		{:else}
			<div class="max-h-80 space-y-3 overflow-y-auto">
				{#each unpaidBills as bill (bill.id + bill.targetDate)}
					{@const Icon = iconMap[bill.category.icon as keyof typeof iconMap] || Receipt}
					{@const daysLeft = getDaysInfo(bill)}
					<div
						class="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
					>
						<div class="flex items-center gap-3">
							<div class={`rounded-full p-2 ${getStatusBgColor(bill.status)}`}>
								<Icon class={`h-4 w-4 ${getStatusColor(bill.status)}`} />
							</div>
							<div>
								<p class="font-medium">{bill.name}</p>
								<div class="text-muted-foreground flex items-center gap-2 text-xs">
									<span>{bill.account.name}</span>
									<span>•</span>
									{#if bill.status === BillStatus.OVERDUE}
										<span
											class="flex items-center gap-1 font-medium text-red-600 dark:text-red-400"
										>
											<AlertTriangle class="h-3 w-3" />
											{$t('bills.daysOverdue', { values: { count: Math.abs(daysLeft) } })}
										</span>
									{:else}
										<span class={`font-medium ${getStatusColor(bill.status)}`}>
											<Clock class="mr-1 inline h-3 w-3" />
											{$t('bills.daysLeft', { values: { count: daysLeft } })}
										</span>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div class="text-right">
								<p class={`font-semibold ${getStatusColor(bill.status)}`}>
									{formatCurrencyWithSymbol(bill.amount, bill.account.currencyCode)}
								</p>
							</div>
							<Button
								variant={bill.status === BillStatus.OVERDUE ? 'destructive' : 'default'}
								size="sm"
								disabled={payingBillId === bill.id}
								onclick={() => payBill(bill)}
							>
								{#if payingBillId === bill.id}
									<LoaderCircle class="h-4 w-4 animate-spin" />
								{:else}
									<Check class="h-4 w-4" />
								{/if}
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
