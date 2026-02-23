<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { iconMap } from '$lib/utils/icons';
	import { t } from 'svelte-i18n';
	import SearchIcon from '@lucide/svelte/icons/search';
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

	let search = $state('');

	// Flatten all categories (parents + children) for search matching
	function matchesSearch(cat: Category, query: string): boolean {
		return cat.name.toLowerCase().includes(query.toLowerCase());
	}

	// Build grouped display: parents with their children, filtered by search
	let groupedCategories = $derived.by(() => {
		const query = search.trim();
		const groups: { parent: Category; children: Category[] }[] = [];
		const standalone: Category[] = [];

		for (const cat of categories) {
			const hasChildren = cat.children && cat.children.length > 0;

			if (hasChildren) {
				const parentMatches = !query || matchesSearch(cat, query);
				const matchingChildren = (cat.children ?? []).filter(
					(child) => !query || matchesSearch(child, query)
				);

				if (parentMatches || matchingChildren.length > 0) {
					groups.push({
						parent: cat,
						children: parentMatches ? (cat.children ?? []) : matchingChildren
					});
				}
			} else {
				if (!query || matchesSearch(cat, query)) {
					standalone.push(cat);
				}
			}
		}

		return { groups, standalone };
	});

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

{#snippet categoryButton(categoryItem: Category)}
	{@const Icon = iconMap[categoryItem.icon as keyof typeof iconMap]}
	<div class="flex flex-col items-center py-2">
		<Button
			variant="outline"
			size="icon"
			class={[
				'mb-2 h-16 w-16 rounded-full transition-transform hover:scale-105 hover:dark:bg-blue-800/10 [&.selected]:bg-blue-800/10 [&.selected]:text-blue-700 [&.selected]:dark:text-blue-400',
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
{/snippet}

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

	<div class="relative">
		<SearchIcon class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
		<Input
			type="text"
			placeholder={$t('transactions.searchCategories')}
			bind:value={search}
			class="pl-9"
		/>
	</div>

	<div class="max-h-64 overflow-y-auto">
		<div class="grid grid-cols-3 gap-4">
			<CreateCategoryDialog {categoryType} data={createCategoryForm} />
		</div>

		{#each groupedCategories.groups as group (group.parent.id)}
			<div class="mt-3">
				<p class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
					{group.parent.name}
				</p>
				<div class="grid grid-cols-3 gap-4">
					{@render categoryButton(group.parent)}
					{#each group.children as child (child.id)}
						{@render categoryButton(child)}
					{/each}
				</div>
			</div>
		{/each}

		{#if groupedCategories.standalone.length > 0}
			<div class="grid grid-cols-3 gap-4" class:mt-3={groupedCategories.groups.length > 0}>
				{#each groupedCategories.standalone as categoryItem (categoryItem.id)}
					{@render categoryButton(categoryItem)}
				{/each}
			</div>
		{/if}
	</div>
</div>
