<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { RefreshCw, TrendingDown, TrendingUp } from '@lucide/svelte';
	import type { CurrencyRates } from '$lib/types';
	import { getCurrencyByCode } from '$lib/utils/currency';
	import Badge from './ui/badge/badge.svelte';
	import { t } from 'svelte-i18n';

	type Props = {
		currencyRates: CurrencyRates | undefined;
		isRefreshing?: boolean;
		onRefreshRates: () => void;
	};

	let { currencyRates, isRefreshing = false, onRefreshRates }: Props = $props();
	let baseCurrency = $derived(getCurrencyByCode(currencyRates?.baseCurrencyCode || 'USD'));
	let currencies = $derived(
		currencyRates?.rates
			? Object.keys(currencyRates.rates)
					.filter((currency) => currency !== baseCurrency?.code)
					.map((currency) => getCurrencyByCode(currency))
					.filter((currency) => !!currency)
			: []
	);
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<div>
			<Card.Title class="text-sm font-medium">{$t('currencies.exchangeRates')}</Card.Title>
			<Card.Description>
				{$t('currencies.exchangeRatesDescription', {
					values: {
						currency: `${baseCurrency?.flag} ${baseCurrency?.code}`,
						date: currencyRates?.updatedAt ? currencyRates.updatedAt.split('T')[0] : '--'
					}
				})}
			</Card.Description>
		</div>
		<Button
			variant="ghost"
			size="icon"
			onclick={onRefreshRates}
			class="h-8 w-8"
			disabled={isRefreshing}
		>
			<RefreshCw class="h-4 w-4" />
		</Button>
	</Card.Header>
	<Card.Content>
		<div class="space-y-2">
			{#each currencies as currency}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<span class="text-lg">{currency.flag}</span>
						<span class="font-medium">{currency.code}</span>
					</div>
					<div class="flex items-center gap-2">
						<span class="font-mono text-sm"
							>{currencyRates?.rates[currency.code].rate.toFixed(4)}</span
						>
						<Badge
							variant={currencyRates?.rates[currency.code].isUp ? 'default' : 'destructive'}
							class="text-xs"
						>
							{#if currencyRates?.rates[currency.code].isUp}
								<TrendingUp class="h-3 w-3" />
							{:else}
								<TrendingDown class="h-3 w-3" />
							{/if}
						</Badge>
					</div>
				</div>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
