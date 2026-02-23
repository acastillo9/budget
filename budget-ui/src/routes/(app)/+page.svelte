<script lang="ts">
	import AccountList from '$lib/components/account-list.svelte';
	import CreateTransactionDialog from '$lib/components/create-transaction-wizard/create-transaction-dialog.svelte';
	import TransactionList from '$lib/components/transaction-list.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { getUserContext } from '$lib/context';
	import TotalCard from '$lib/components/total-card.svelte';
	import CurrencyRatesCard from '$lib/components/currency-rates-card.svelte';
	import { toast } from 'svelte-sonner';
	import BalanceBreakdownCard from '$lib/components/balance-breakdown-card.svelte';
	import UpcomingBillsCard from '$lib/components/upcoming-bills-card.svelte';
	import type { AccountSummary } from '$lib/types/account.types';

	let { data }: PageProps = $props();

	const userState = getUserContext();

	// svelte-ignore state_referenced_locally
	let usdExchangeRates = $state(data.usdExchangeRates);
	let isRefreshingRates = $state(false);
	let userCurrencyCode = $derived(userState.user?.currencyCode || 'USD');
	let rates = $derived(userState.currencyRates?.rates || {});
	let totalBalance = $derived(
		data.accountsSummary.reduce(
			(acc: number, accountSummary: AccountSummary) =>
				acc + accountSummary.totalBalance / rates[accountSummary.currencyCode].rate,
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
						transactionSummary.totalIncome / rates[transactionSummary.currencyCode].rate,
					totalExpenses:
						acc.totalExpenses +
						transactionSummary.totalExpenses / rates[transactionSummary.currencyCode].rate
				};
			},
			{ totalIncome: 0, totalExpenses: 0 }
		)
	);

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

			<div class="flex items-center space-x-2">
				{#if data.accounts.length > 0}
					<CreateTransactionDialog
						addTransactionForm={data.addTransactionForm}
						addTransferForm={data.addTransferForm}
						createCategoryForm={data.createCategoryForm}
						categories={data.categories}
						accounts={data.accounts}
					/>
				{/if}
			</div>
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
						currencyRates={userState.currencyRates!}
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
