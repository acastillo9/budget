<script lang="ts">
	import CreateCategoryDialog from '$lib/components/create-category-dialog.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import CategoryList from '$lib/components/category-list.svelte';
	import * as Pagination from '$lib/components/ui/pagination';
	import type { Category } from '$lib/types/category.types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';

	const PER_PAGE = 15;
	let { data }: PageProps = $props();
	let page = $state(1);
	let selectedCategory: Category | undefined = $state(undefined);
	let isEditCategoryDialogOpen = $state(false);

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	const confirmDeleteCategory = (category: Category) => {
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('categories.deleteCategoryTitle'),
			description: $t('categories.deleteCategoryDescription', {
				values: { name: category.name }
			}),
			onConfirm: () => {
				deleteCategory(category);
			}
		};
	};

	async function deleteCategory(category: Category) {
		confirmationDialog.loading = true;
		try {
			const uri = `/api/categories/${category.id}`;
			const response = await fetch(uri, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete category');
			}

			confirmationDialog = {
				open: false,
				loading: false,
				title: '',
				description: '',
				onConfirm: () => {}
			};

			toast.success($t('categories.deleteCategorySuccess'));

			invalidateAll();
		} catch {
			toast.error($t('categories.deleteCategoryError'));
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('categories.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('categories.title')}</h1>
				<p class="text-muted-foreground">{$t('categories.description')}</p>
			</div>

			<div class="flex items-center space-x-2">
				<CreateCategoryDialog
					data={data.createCategoryForm}
					category={selectedCategory}
					bind:open={isEditCategoryDialogOpen}
					onClose={() => {
						selectedCategory = undefined;
					}}
				/>
			</div>
		</div>
	</div>

	<div class="container mx-auto">
		<CategoryList
			categories={data.categories.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
			onEdit={(event) => {
				selectedCategory = event;
				isEditCategoryDialogOpen = true;
			}}
			onDelete={confirmDeleteCategory}
		/>
		<Pagination.Root count={data.categories.length} perPage={PER_PAGE} bind:page>
			{#snippet children({ pages, currentPage })}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.PrevButton />
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link {page} isActive={currentPage === page.value}>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.NextButton />
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
	</div>
</section>

<ConfirmationDialog
	open={confirmationDialog.open}
	onOpenChange={(open: boolean) => (confirmationDialog.open = open)}
	title={confirmationDialog.title}
	description={confirmationDialog.description}
	confirmText={$t('common.delete')}
	cancelText={$t('common.cancel')}
	variant="destructive"
	onConfirm={confirmationDialog.onConfirm}
	loading={confirmationDialog.loading}
/>
