<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from 'svelte-i18n';
	import { Badge } from '$lib/components/ui/badge';
	import Button from './ui/button/button.svelte';
	import { Edit, Trash2, Tags } from '@lucide/svelte';
	import type { Category } from '$lib/types/category.types';
	import { iconMap } from '$lib/utils/icons';

	interface Props {
		categories: Category[];
		onEdit?: (category: Category) => void;
		onDelete?: (category: Category) => void;
	}

	let { categories, onEdit = () => {}, onDelete = () => {} }: Props = $props();
</script>

<Card.Root class="mb-4">
	<Card.Content>
		{#if categories.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<Tags class="mx-auto mb-4 h-12 w-12 opacity-50" />
				<p>{$t('categories.noCategories')}</p>
			</div>
		{:else}
			<div class="grid gap-4 lg:grid-cols-3">
				{#each categories as category (category.id)}
					{@const Icon = iconMap[category.icon as keyof typeof iconMap]}
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="flex items-center gap-3">
							<Icon class="h-6 w-6" />
							<div>
								<p class="font-medium">{category.name}</p>
								<div class="text-muted-foreground flex items-center gap-2 text-xs">
									<Badge
										variant={category.categoryType === 'INCOME' ? 'default' : 'destructive'}
										class="text-xs"
									>
										{$t(`categories.categoryType.${category.categoryType}`)}
									</Badge>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Button variant="ghost" size="icon" onclick={() => onEdit(category)}>
								<Edit class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								onclick={() => onDelete(category)}
								class="text-destructive hover:text-destructive"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
