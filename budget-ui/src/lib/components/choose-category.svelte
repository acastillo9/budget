<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { iconMap } from '$lib/utils/icons';
	import { t } from 'svelte-i18n';
	import Button from './ui/button/button.svelte';
	import CreateCategoryDialog from './create-category-dialog.svelte';
	import type { Category } from '$lib/types/category.types';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { createCategorySchema } from '$lib/schemas/category.schema';

	let {
		categoryType,
		createCategoryForm,
		categories,
		category = $bindable(),
		selectedCategories = $bindable([]),
		multiSelect = false
	}: {
		categoryType: string;
		createCategoryForm: SuperValidated<Infer<typeof createCategorySchema>>;
		categories: Category[];
		category?: Category;
		selectedCategories?: Category[];
		multiSelect?: boolean;
	} = $props();

	function isSelected(item: Category): boolean {
		if (multiSelect) {
			return selectedCategories.some((c) => c.id === item.id);
		}
		return item.id === category?.id;
	}

	function handleClick(item: Category) {
		if (multiSelect) {
			const idx = selectedCategories.findIndex((c) => c.id === item.id);
			if (idx >= 0) {
				selectedCategories = selectedCategories.filter((c) => c.id !== item.id);
			} else {
				selectedCategories = [...selectedCategories, item];
			}
		} else {
			category = item;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<h3 class="font-medium">
			{$t('transactions.chooseCategoryWithType', {
				values: {
					categoryType: $t(`categories.categoryType.${categoryType}`)
				}
			})}
		</h3>
		<div class="flex items-center gap-2">
			{#if multiSelect && selectedCategories.length > 0}
				<span class="text-muted-foreground text-sm">{selectedCategories.length} selected</span>
			{/if}
			<Badge variant={categoryType === 'INCOME' ? 'default' : 'destructive'}>
				{$t(`categories.categoryType.${categoryType}`).toUpperCase()}
			</Badge>
		</div>
	</div>

	<div class="grid max-h-64 grid-cols-3 gap-4 overflow-y-auto">
		{#each categories as categoryItem (categoryItem.id)}
			{@const Icon = iconMap[categoryItem.icon as keyof typeof iconMap]}
			<div class="flex flex-col items-center py-2">
				<Button
					variant="outline"
					size="icon"
					class={[
						'h-16 w-16 rounded-full transition-transform hover:scale-105 hover:dark:bg-blue-800/10 [&.selected]:bg-blue-800/10 [&.selected]:text-blue-700 [&.selected]:dark:text-blue-400',
						{
							'selected border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400':
								isSelected(categoryItem),
							'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400':
								!isSelected(categoryItem)
						}
					]}
					onclick={() => handleClick(categoryItem)}
				>
					<Icon class="h-6 w-6" />
				</Button>
				<div class="text-center">
					<p class="text-xs font-medium">{categoryItem.name}</p>
				</div>
			</div>
		{/each}

		<CreateCategoryDialog {categoryType} data={createCategoryForm} />
	</div>
</div>
