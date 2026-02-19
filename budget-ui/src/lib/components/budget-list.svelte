<script lang="ts">
	import { t } from 'svelte-i18n';
	import { PiggyBank } from '@lucide/svelte';
	import BudgetItem from './budget-item.svelte';
	import type { BudgetProgress } from '$lib/types/budget.types';

	type Props = {
		budgets: BudgetProgress[];
		onEdit?: (budget: BudgetProgress) => void;
		onDelete?: (budget: BudgetProgress) => void;
	};

	let { budgets, onEdit = () => {}, onDelete = () => {} }: Props = $props();
</script>

{#if budgets.length === 0}
	<div class="text-muted-foreground py-12 text-center">
		<PiggyBank class="mx-auto mb-4 h-12 w-12 opacity-50" />
		<p>{$t('budgets.noBudgets')}</p>
	</div>
{:else}
	<div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
		{#each budgets as budget (budget.budgetId)}
			<BudgetItem {budget} onEdit={() => onEdit(budget)} onDelete={() => onDelete(budget)} />
		{/each}
	</div>
{/if}
