<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { t } from 'svelte-i18n';
	import { Badge } from '$lib/components/ui/badge';
	import Button from './ui/button/button.svelte';
	import { Edit, Trash2, Tags, ChevronRight, Plus } from '@lucide/svelte';
	import type { Category } from '$lib/types/category.types';
	import { iconMap } from '$lib/utils/icons';

	interface Props {
		categories: Category[];
		editable?: boolean;
		onEdit?: (category: Category) => void;
		onDelete?: (category: Category) => void;
		onAddSubcategory?: (parent: Category) => void;
	}

	let {
		categories,
		editable = true,
		onEdit = () => {},
		onDelete = () => {},
		onAddSubcategory = () => {}
	}: Props = $props();
</script>

<Card.Root class="mb-4">
	<Card.Content>
		{#if categories.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<Tags class="mx-auto mb-4 h-12 w-12 opacity-50" />
				<p>{$t('categories.noCategories')}</p>
			</div>
		{:else}
			<div class="grid gap-3">
				{#each categories as category (category.id)}
					{@const Icon = iconMap[category.icon as keyof typeof iconMap]}
					{@const hasChildren = category.children && category.children.length > 0}

					{#if hasChildren}
						<Collapsible.Root>
							<div class="rounded-lg border">
								<div class="flex items-center justify-between p-4">
									<Collapsible.Trigger class="flex flex-1 cursor-pointer items-center gap-3">
										<ChevronRight
											class="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]_&]:rotate-90"
										/>
										<Icon class="h-6 w-6 shrink-0" />
										<div class="min-w-0 flex-1 text-left">
											<p class="font-medium">{category.name}</p>
											<div class="flex items-center gap-2">
												<Badge
													variant={category.categoryType === 'INCOME' ? 'default' : 'destructive'}
													class="text-xs"
												>
													{$t(`categories.categoryType.${category.categoryType}`)}
												</Badge>
												<span class="text-muted-foreground text-xs">
													{$t('categories.childCount', {
														values: { count: category.children?.length ?? 0 }
													})}
												</span>
											</div>
										</div>
									</Collapsible.Trigger>
									{#if editable}
										<div class="flex shrink-0 items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												title={$t('categories.addSubcategory')}
												onclick={() => onAddSubcategory(category)}
											>
												<Plus class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												title="Edit"
												onclick={() => onEdit(category)}
											>
												<Edit class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive hover:text-destructive h-8 w-8"
												title="Delete"
												onclick={() => onDelete(category)}
											>
												<Trash2 class="h-4 w-4" />
											</Button>
										</div>
									{/if}
								</div>
								<Collapsible.Content>
									<div class="border-t px-4 pt-2 pb-3">
										<div class="ml-8 grid gap-2">
											{#each category.children ?? [] as child (child.id)}
												{@const ChildIcon = iconMap[child.icon as keyof typeof iconMap]}
												<div class="flex items-center justify-between rounded-md border p-3">
													<div class="flex items-center gap-3">
														<ChildIcon class="h-5 w-5" />
														<p class="text-sm font-medium">{child.name}</p>
													</div>
													{#if editable}
														<div class="flex items-center gap-1">
															<Button
																variant="ghost"
																size="icon"
																class="h-7 w-7"
																title="Edit"
																onclick={() => onEdit(child)}
															>
																<Edit class="h-3.5 w-3.5" />
															</Button>
															<Button
																variant="ghost"
																size="icon"
																class="text-destructive hover:text-destructive h-7 w-7"
																title="Delete"
																onclick={() => onDelete(child)}
															>
																<Trash2 class="h-3.5 w-3.5" />
															</Button>
														</div>
													{/if}
												</div>
											{/each}
										</div>
									</div>
								</Collapsible.Content>
							</div>
						</Collapsible.Root>
					{:else}
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
							{#if editable}
								<div class="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										title={$t('categories.addSubcategory')}
										onclick={() => onAddSubcategory(category)}
									>
										<Plus class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="h-8 w-8"
										title="Edit"
										onclick={() => onEdit(category)}
									>
										<Edit class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										class="text-destructive hover:text-destructive h-8 w-8"
										title="Delete"
										onclick={() => onDelete(category)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
