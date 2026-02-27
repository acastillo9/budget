<script lang="ts">
	import { t } from 'svelte-i18n';
	import { Edit, Trash2 } from '@lucide/svelte';
	import Button from './ui/button/button.svelte';
	import CategoryBadge from './category-badge.svelte';
	import Badge from './ui/badge/badge.svelte';
	import BudgetProgressBar from './budget-progress-bar.svelte';
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import { getUserContext } from '$lib/context';
	import type { BudgetProgress } from '$lib/types/budget.types';

	type Props = {
		budget: BudgetProgress;
		editable?: boolean;
		onEdit?: () => void;
		onDelete?: () => void;
	};

	let { budget, editable = true, onEdit = () => {}, onDelete = () => {} }: Props = $props();

	const userState = getUserContext();
	const currencyCode = $derived(userState.user?.currencyCode ?? 'USD');
</script>

<div class="space-y-4 rounded-lg border p-4">
	<!-- Header -->
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				{#if budget.name}
					<h3 class="truncate text-base font-semibold">{budget.name}</h3>
				{/if}
				<Badge variant="secondary" class="shrink-0">
					{$t(`budgets.periods.${budget.period}`)}
				</Badge>
			</div>
			<p class="text-muted-foreground mt-1 text-sm">
				{$t('budgets.budgetAmount')}:
				<span class="text-foreground font-medium">
					{formatCurrencyWithSymbol(budget.amount, currencyCode)}
				</span>
			</p>
		</div>
		{#if editable}
			<div class="flex shrink-0 items-center gap-1">
				<Button variant="ghost" size="icon" onclick={onEdit} aria-label={$t('budgets.editBudget')}>
					<Edit class="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={onDelete}
					class="text-destructive hover:text-destructive"
					aria-label={$t('budgets.deleteBudget')}
				>
					<Trash2 class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>

	<!-- Progress bar -->
	<BudgetProgressBar progress={budget} />

	<!-- Categories -->
	{#if budget.categories && budget.categories.length > 0}
		<div class="flex flex-wrap gap-2">
			{#each budget.categories as category (category.id)}
				<CategoryBadge {category} size="sm" />
			{/each}
		</div>
	{/if}
</div>
