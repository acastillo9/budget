<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { ChartPie } from '@lucide/svelte';
	import Badge from './ui/badge/badge.svelte';
	import { formatCurrencyWithSymbol, getCurrencyByCode } from '$lib/utils/currency';
	import type { AccountSummary } from '$lib/types/account.types';
	import type { CurrencyRates } from '$lib/types';
	import { t } from 'svelte-i18n';

	type AccountSummaryByCurrency = {
		totalBalance: number;
		totalBalanceConverted: number;
		accountsCount: number;
	};

	type AccountsSummaryByCurrency = {
		[currencyCode: string]: AccountSummaryByCurrency;
	};

	let { accountsSummary, currencyRates }: { accountsSummary: AccountSummary[]; currencyRates: CurrencyRates } = $props();
	let baseCurrency = $derived(getCurrencyByCode(currencyRates.baseCurrencyCode || 'USD'));
	let accountsSummaryByCurrency: AccountsSummaryByCurrency = $derived(
		accountsSummary.reduce((acc: AccountsSummaryByCurrency, accountSummary: AccountSummary) => {
			if (!acc[accountSummary.currencyCode]) {
				acc[accountSummary.currencyCode] = {
					totalBalance: 0,
					totalBalanceConverted: 0,
					accountsCount: 0
				};
			}
			acc[accountSummary.currencyCode].totalBalance += accountSummary.totalBalance;
			acc[accountSummary.currencyCode].totalBalanceConverted +=
				accountSummary.totalBalance / currencyRates.rates[accountSummary.currencyCode].rate;
			acc[accountSummary.currencyCode].accountsCount += accountSummary.accountsCount;
			return acc;
		}, {})
	);
	let totalConvertedBalance = $derived(
		Object.values(accountsSummaryByCurrency).reduce(
			(sum: number, accountSummary: AccountSummaryByCurrency) =>
				sum + Math.abs(accountSummary.totalBalanceConverted),
			0
		)
	);
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<div>
			<Card.Title class="text-sm font-medium">{$t('dashboard.balanceBreakdown')}</Card.Title>
			<Card.Description>
				{$t('dashboard.balanceBreakdownDescription', {
					values: {
						currencyFlag: baseCurrency?.flag || '',
						currencyCode: baseCurrency?.code || 'USD'
					}
				})}
			</Card.Description>
		</div>
		<div class="flex items-center gap-2">
			<ChartPie class="text-muted-foreground h-4 w-4" />
		</div>
	</Card.Header>
	<Card.Content>
		<div class="space-y-3">
			{#each Object.keys(accountsSummaryByCurrency) as currencyCode}
				{@const accountCurrency = getCurrencyByCode(currencyCode)}
				{@const accountSummary = accountsSummaryByCurrency[currencyCode]}
				{@const percentage =
					(Math.abs(accountSummary.totalBalanceConverted) / totalConvertedBalance) * 100}

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-lg">{accountCurrency?.flag}</span>
							<span class="font-medium">{accountCurrency?.code}</span>
							<Badge variant="outline" class="text-xs">
								{accountSummary.accountsCount === 1
									? $t('dashboard.accountsCountSingular', {
											values: {
												count: accountSummary.accountsCount
											}
										})
									: $t('dashboard.accountsCountPlural', {
											values: {
												count: accountSummary.accountsCount
											}
										})}
							</Badge>
						</div>
						<div class="text-right">
							<p class="font-semibold">
								{formatCurrencyWithSymbol(accountSummary.totalBalance, accountCurrency!.code)}
							</p>
							{#if accountCurrency!.code !== baseCurrency?.code}
								<p class="text-muted-foreground text-xs">
									≈ {formatCurrencyWithSymbol(
										accountSummary.totalBalanceConverted,
										accountCurrency!.code
									)}
								</p>
							{/if}
						</div>
					</div>

					<div class="bg-muted h-2 w-full rounded-full">
						<div
							class="bg-primary h-2 rounded-full transition-all duration-300"
							style="width: {Math.max(percentage, 2)}%"
						></div>
					</div>
					<div class="text-muted-foreground text-right text-xs">
						{$t('dashboard.balanceBreakdownPercentage', {
							values: {
								percentage: percentage.toFixed(1)
							}
						})}
					</div>
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
