<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { t } from 'svelte-i18n';

	let { type = $bindable() } = $props();
</script>

<div class="space-y-4">
	<div>
		<h3 class="mb-3 font-medium">{$t('transactions.whatTypeOfTransaction')}</h3>
		<div class="grid grid-cols-3 gap-3">
			<Button
				variant="outline"
				class={[
					'flex h-20 flex-col gap-2 hover:border-green-300 hover:bg-green-50 dark:hover:border-green-700 dark:hover:bg-green-800/10 [&.selected]:border-green-300 [&.selected]:bg-green-50 dark:[&.selected]:border-green-700 dark:[&.selected]:bg-green-800/10',
					{ selected: type === 'INCOME' }
				]}
				onclick={() => (type = 'INCOME')}
			>
				<TrendingUp class="h-6 w-6 text-green-600" />
				<span class="font-medium">{$t('transactions.income')}</span>
			</Button>
			<Button
				variant="outline"
				class={[
					'flex h-20 flex-col gap-2 hover:border-red-300 hover:bg-red-50 dark:hover:border-red-700 dark:hover:bg-red-800/10 [&.selected]:border-red-300 [&.selected]:bg-red-50 dark:[&.selected]:border-red-700 dark:[&.selected]:bg-red-800/10',
					{ selected: type === 'EXPENSE' }
				]}
				onclick={() => (type = 'EXPENSE')}
			>
				<TrendingDown class="h-6 w-6 text-red-600" />
				<span class="font-medium">{$t('transactions.expense')}</span>
			</Button>
			<Button
				variant="outline"
				class={[
					'flex h-20 flex-col gap-2 hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-700 dark:hover:bg-blue-800/10 [&.selected]:border-blue-300 [&.selected]:bg-blue-50 dark:[&.selected]:border-blue-700 dark:[&.selected]:bg-blue-800/10',
					{ selected: type === 'TRANSFER' }
				]}
				onclick={() => (type = 'TRANSFER')}
			>
				<ArrowRight class="h-6 w-6 text-blue-600" />
				<span class="font-medium">{$t('transactions.transfer')}</span>
			</Button>
		</div>
	</div>
</div>
