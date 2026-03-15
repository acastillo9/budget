<script lang="ts">
	import AccountList from '$lib/components/account-list.svelte';
	import CreateTransactionDialog from '$lib/components/create-transaction-wizard/create-transaction-dialog.svelte';
	import TransactionList from '$lib/components/transaction-list.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { getUserContext } from '$lib/context';
	import { canEdit } from '$lib/utils/permissions';
	import TotalCard from '$lib/components/total-card.svelte';
	import BillSummaryCard from '$lib/components/bill-summary-card.svelte';
	import CurrencyRatesCard from '$lib/components/currency-rates-card.svelte';
	import { toast } from 'svelte-sonner';
	import BalanceBreakdownCard from '$lib/components/balance-breakdown-card.svelte';
	import UpcomingBillsCard from '$lib/components/upcoming-bills-card.svelte';
	import type { AccountSummary } from '$lib/types/account.types';
	import { BillStatus, type Bill } from '$lib/types/bill.types';

	let { data }: PageProps = $props();

	const userState = getUserContext();
	let editable = $derived(canEdit(userState.workspaceRole!));

	// svelte-ignore state_referenced_locally
	let usdExchangeRates = $state(data.usdExchangeRates);
	let isRefreshingRates = $state(false);
	let userCurrencyCode = $derived(userState.user?.currencyCode || 'USD');
	let rates = $derived(userState.currencyRates?.rates || {});
	let totalBalance = $derived(
		data.accountsSummary.reduce(
			(acc: number, accountSummary: AccountSummary) =>
				acc + accountSummary.totalBalance / (rates[accountSummary.currencyCode]?.rate || 1),
			0
		)
	);
	let transactionsSummary = $derived(
		data.transactionsSummary.reduce(
			(
				acc: { totalIncome: number; totalExpenses: number },
				transactionSummary: { totalIncome: number; totalExpenses: number; currencyCode: string }
			) => {
				return {
					totalIncome:
						acc.totalIncome +
						transactionSummary.totalIncome / (rates[transactionSummary.currencyCode]?.rate || 1),
					totalExpenses:
						acc.totalExpenses +
						transactionSummary.totalExpenses / (rates[transactionSummary.currencyCode]?.rate || 1)
				};
			},
			{ totalIncome: 0, totalExpenses: 0 }
		)
	);

	let billsSummary = $derived(
		data.bills.reduce(
			(
				acc: {
					overdue: { count: number; total: number };
					dueSoon: { count: number; total: number };
					paid: { count: number; total: number };
				},
				bill: Bill
			) => {
				const convertedAmount = bill.amount / (rates[bill.account.currencyCode]?.rate || 1);
				if (bill.status === BillStatus.OVERDUE) {
					acc.overdue.count++;
					acc.overdue.total += convertedAmount;
				} else if (bill.status === BillStatus.DUE || bill.status === BillStatus.UPCOMING) {
					acc.dueSoon.count++;
					acc.dueSoon.total += convertedAmount;
				} else if (bill.status === BillStatus.PAID) {
					acc.paid.count++;
					acc.paid.total += convertedAmount;
				}
				return acc;
			},
			{
				overdue: { count: 0, total: 0 },
				dueSoon: { count: 0, total: 0 },
				paid: { count: 0, total: 0 }
			}
		)
	);
	let totalToPay = $derived({
		count: billsSummary.overdue.count + billsSummary.dueSoon.count,
		total: billsSummary.overdue.total + billsSummary.dueSoon.total
	});

	async function onRefreshRates() {
		isRefreshingRates = true;
		try {
			const response = await fetch('/api/currencies/USD');
			usdExchangeRates = await response.json();
		} catch {
			toast.error($t('currencies.loadExchangeRatesError'));
		} finally {
			isRefreshingRates = false;
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('dashboard.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('dashboard.title')}</h1>
				<p class="text-muted-foreground">{$t('dashboard.description')}</p>
			</div>

			{#if editable && data.accounts.length > 0}
				<div class="flex items-center space-x-2">
					<CreateTransactionDialog
						addTransactionForm={data.addTransactionForm}
						addTransferForm={data.addTransferForm}
						createCategoryForm={data.createCategoryForm}
						categories={data.categories}
						accounts={data.accounts}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="container mx-auto">
		<div class="space-y-6">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
				<TotalCard
					title={$t('dashboard.netWorth')}
					description={$t('dashboard.netWorthDescription', {
						values: { count: data.accounts.length, currency: userCurrencyCode }
					})}
					total={formatCurrencyWithSymbol(totalBalance, userCurrencyCode)}
				></TotalCard>
				<TotalCard
					title={$t('dashboard.totalIncome')}
					description={$t('dashboard.totalTransactionsDescription', {
						values: { currency: userCurrencyCode }
					})}
					total={formatCurrencyWithSymbol(transactionsSummary.totalIncome, userCurrencyCode)}
					variant="income"
				></TotalCard>
				<TotalCard
					title={$t('dashboard.totalExpenses')}
					description={$t('dashboard.totalTransactionsDescription', {
						values: { currency: userCurrencyCode }
					})}
					total={formatCurrencyWithSymbol(transactionsSummary.totalExpenses, userCurrencyCode)}
					variant="expense"
				></TotalCard>
				<TotalCard
					title={$t('dashboard.cashFlow')}
					description={$t('dashboard.cashFlowDescription', {
						values: { currency: userCurrencyCode }
					})}
					total={formatCurrencyWithSymbol(
						transactionsSummary.totalIncome - transactionsSummary.totalExpenses,
						userCurrencyCode
					)}
					variant={transactionsSummary.totalIncome - transactionsSummary.totalExpenses >= 0
						? 'income'
						: 'expense'}
				></TotalCard>
			</div>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
				<BillSummaryCard
					title={$t('dashboard.overdueBills')}
					description={$t('dashboard.overdueBillsDescription')}
					count={billsSummary.overdue.count}
					total={formatCurrencyWithSymbol(billsSummary.overdue.total, userCurrencyCode)}
					variant="overdue"
				/>
				<BillSummaryCard
					title={$t('dashboard.dueSoonBills')}
					description={$t('dashboard.dueSoonBillsDescription')}
					count={billsSummary.dueSoon.count}
					total={formatCurrencyWithSymbol(billsSummary.dueSoon.total, userCurrencyCode)}
					variant="due"
				/>
				<BillSummaryCard
					title={$t('dashboard.paidBills')}
					description={$t('dashboard.paidBillsDescription')}
					count={billsSummary.paid.count}
					total={formatCurrencyWithSymbol(billsSummary.paid.total, userCurrencyCode)}
					variant="paid"
				/>
				<BillSummaryCard
					title={$t('dashboard.totalToPay')}
					description={$t('dashboard.totalToPayDescription')}
					count={totalToPay.count}
					total={formatCurrencyWithSymbol(totalToPay.total, userCurrencyCode)}
					variant="total"
				/>
			</div>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<CurrencyRatesCard
						currencyRates={usdExchangeRates}
						isRefreshing={isRefreshingRates}
						{onRefreshRates}
					/>
				</div>
				<div>
					<BalanceBreakdownCard
						accountsSummary={data.accountsSummary}
						currencyRates={userState.currencyRates}
					/>
				</div>
			</div>
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div>
					<AccountList accounts={data.accounts} {rates} />
				</div>
				<div>
					<TransactionList transactions={data.transactions} {rates} />
				</div>
				<div>
					<UpcomingBillsCard bills={data.bills} />
				</div>
			</div>
		</div>
	</div>
</section>
