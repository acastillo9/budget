<script lang="ts">
	import { t } from 'svelte-i18n';
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { getUserContext } from '$lib/context';
	import { formatUTCStringDateWithLocal } from '$lib/utils/date';
	import type { BudgetProgress } from '$lib/types/budget.types';

	type Props = {
		progress: BudgetProgress;
	};

	let { progress }: Props = $props();

	const userState = getUserContext();

	let percent = $derived(Math.min(progress.percentUsed, 100));
	let isOverBudget = $derived(progress.percentUsed >= 100);
	let isWarning = $derived(progress.percentUsed >= 75 && progress.percentUsed < 100);

	let barColor = $derived.by(() => {
		if (isOverBudget) return 'bg-red-500';
		if (isWarning) return 'bg-yellow-500';
		return 'bg-green-500';
	});

	let textColor = $derived.by(() => {
		if (isOverBudget) return 'text-red-600 dark:text-red-400';
		if (isWarning) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-green-600 dark:text-green-400';
	});

	const currencyCode = $derived(userState.user?.currencyCode ?? 'USD');
</script>

<div class="space-y-2">
	<!-- Progress bar -->
	<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
		<div
			class={`h-full rounded-full transition-all duration-300 ${barColor}`}
			style={`width: ${percent}%`}
			role="progressbar"
			aria-valuenow={progress.percentUsed}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label={$t('budgets.percentUsed', {
				values: { percent: progress.percentUsed.toFixed(0) }
			})}
		></div>
	</div>

	<!-- Spent / Amount -->
	<div class="flex items-center justify-between text-sm">
		<span class={`font-medium ${textColor}`}>
			{#if isOverBudget}
				{$t('budgets.overBudget')}
			{:else}
				{$t('budgets.percentUsed', { values: { percent: progress.percentUsed.toFixed(0) } })}
			{/if}
		</span>
		<span class="text-muted-foreground">
			{formatCurrencyWithSymbol(progress.spent, currencyCode)}
			{$t('budgets.of')}
			{formatCurrencyWithSymbol(progress.amount, currencyCode)}
		</span>
	</div>

	<!-- Remaining -->
	<div class="text-muted-foreground flex items-center justify-between text-xs">
		<span>
			{$t('budgets.remaining')}:
			<span class={`font-medium ${textColor}`}>
				{formatCurrencyWithSymbol(Math.abs(progress.remaining), currencyCode)}
				{#if isOverBudget}
					{$t('budgets.overBudget').toLowerCase()}
				{/if}
			</span>
		</span>
		<span>
			{formatUTCStringDateWithLocal(progress.periodStart)} –
			{formatUTCStringDateWithLocal(progress.periodEnd)}
		</span>
	</div>
</div>
