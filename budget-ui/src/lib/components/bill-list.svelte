<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { AlertTriangle, CalendarClock, CheckCircle, Clock, Wallet } from '@lucide/svelte';
	import { t } from 'svelte-i18n';
	import { BillStatus, type Bill } from '$lib/types/bill.types';
	import Badge from './ui/badge/badge.svelte';
	import BillItem from './bill-item.svelte';

	type Props = {
		bills: Bill[];
		headless?: boolean;
		isCurrentMonth?: boolean;
		isPayingBill?: string | undefined;
		isUnpayingBill?: string | undefined;
		payBill?: (bill: Bill) => void;
		unpayBill?: (bill: Bill) => void;
		onEdit?: (bill: Bill) => void;
		onDelete?: (bill: Bill) => void;
	};
	let {
		bills,
		headless = false,
		isCurrentMonth = true,
		isPayingBill = undefined,
		isUnpayingBill = undefined,
		payBill = () => {},
		unpayBill = () => {},
		onEdit = () => {},
		onDelete = () => {}
	}: Props = $props();

	// For current month: show DUE and UPCOMING in "Due Soon"
	// For other months: show DUE and UPCOMING in "Upcoming Bills"
	let pendingBills = $derived(
		bills.filter((bill) => bill.status === BillStatus.DUE || bill.status === BillStatus.UPCOMING)
	);
	let overdueBills = $derived(bills.filter((bill) => bill.status === BillStatus.OVERDUE));
	let paidBills = $derived(bills.filter((bill) => bill.status === BillStatus.PAID));
</script>

<Card.Root class="mb-4">
	{#if !headless}
		<Card.Header>
			<Card.Title>{$t('bills.yourBills')}</Card.Title>
			<Card.Description>{$t('bills.yourBillsDescription')}</Card.Description>
		</Card.Header>
	{/if}
	<Card.Content>
		{#if bills.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<Wallet class="mx-auto mb-4 h-12 w-12 opacity-50" />
				<p>{$t('bills.noBills')}</p>
			</div>
		{:else}
			<div class="space-y-5">
				{#if overdueBills.length > 0}
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<AlertTriangle class="h-5 w-5 text-red-600" />
							<h3 class="text-lg font-semibold text-red-600">{$t('bills.overdueBills')}</h3>
							<Badge variant="destructive" class="ml-2">
								{overdueBills.length}
							</Badge>
						</div>
						<div class="grid gap-3">
							{#each overdueBills as bill (bill.id + bill.targetDate)}
								<BillItem
									{bill}
									pay={(event: Bill) => payBill(event)}
									isPaying={bill.id === isPayingBill}
									onEdit={() => onEdit(bill)}
									onDelete={() => onDelete(bill)}
								/>
							{/each}
						</div>
					</div>
				{/if}
				{#if pendingBills.length > 0}
					{#if isCurrentMonth}
						<!-- Due Soon section for current month -->
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<Clock class="h-5 w-5 text-yellow-600" />
								<h3 class="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
									{$t('bills.dueSoon')}
								</h3>
								<Badge variant="outline" class="border-yellow-300 text-yellow-700">
									{pendingBills.length}
								</Badge>
							</div>
							<div class="grid gap-3">
								{#each pendingBills as bill (bill.id + bill.targetDate)}
									<BillItem
										{bill}
										{isCurrentMonth}
										pay={(event: Bill) => payBill(event)}
										isPaying={bill.id === isPayingBill}
										onEdit={() => onEdit(bill)}
										onDelete={() => onDelete(bill)}
									/>
								{/each}
							</div>
						</div>
					{:else}
						<!-- Upcoming Bills section for other months -->
						<div class="space-y-3">
							<div class="flex items-center gap-2">
								<CalendarClock class="h-5 w-5 text-blue-600" />
								<h3 class="text-lg font-semibold text-blue-700 dark:text-blue-300">
									{$t('bills.upcomingBills')}
								</h3>
								<Badge variant="outline" class="border-blue-300 text-blue-700">
									{pendingBills.length}
								</Badge>
							</div>
							<div class="grid gap-3">
								{#each pendingBills as bill (bill.id + bill.targetDate)}
									<BillItem
										{bill}
										{isCurrentMonth}
										pay={(event: Bill) => payBill(event)}
										isPaying={bill.id === isPayingBill}
										onEdit={() => onEdit(bill)}
										onDelete={() => onDelete(bill)}
									/>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
				{#if paidBills.length > 0}
					<div class="space-y-3">
						<div class="flex items-center gap-2">
							<CheckCircle class="h-5 w-5 text-green-600" />
							<h3 class="text-lg font-semibold text-green-700 dark:text-green-300">
								{$t('bills.paidBills')}
							</h3>
							<Badge variant="outline" class="ml-2 border-green-300 text-green-700">
								{paidBills.length}
							</Badge>
						</div>
						<div class="grid gap-3">
							{#each paidBills as bill (bill.id + bill.targetDate)}
								<BillItem
									{bill}
									onEdit={() => onEdit(bill)}
									unpay={(event: Bill) => unpayBill(event)}
									isUnpaying={bill.id === isUnpayingBill}
									onDelete={() => onDelete(bill)}
								/>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
