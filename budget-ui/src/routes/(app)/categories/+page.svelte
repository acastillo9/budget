<script lang="ts">
	import CreateCategoryDialog from '$lib/components/create-category-dialog.svelte';
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import CategoryList from '$lib/components/category-list.svelte';
	import type { Category } from '$lib/types/category.types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import { getUserContext } from '$lib/context';
	import { canEdit } from '$lib/utils/permissions';

	let { data }: PageProps = $props();
	let selectedCategory: Category | undefined = $state(undefined);
	let isEditCategoryDialogOpen = $state(false);
	let preSelectedParent: Category | undefined = $state(undefined);

	const userState = getUserContext();
	let editable = $derived(canEdit(userState.workspaceRole!));

	// Top-level categories (those without a parent) for the parent dropdown
	let parentCategories = $derived(data.categories.filter((c) => !c.parent));

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	const confirmDeleteCategory = (category: Category) => {
		const hasChildren = category.children && category.children.length > 0;
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('categories.deleteCategoryTitle'),
			description: hasChildren
				? $t('categories.deleteParentWarning', {
						values: { name: category.name }
					})
				: $t('categories.deleteCategoryDescription', {
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

	function handleAddSubcategory(parent: Category) {
		preSelectedParent = parent;
		selectedCategory = undefined;
		isEditCategoryDialogOpen = true;
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

			{#if editable}
				<div class="flex items-center space-x-2">
					<CreateCategoryDialog
						data={data.createCategoryForm}
						category={selectedCategory}
						{parentCategories}
						{preSelectedParent}
						bind:open={isEditCategoryDialogOpen}
						onClose={() => {
							selectedCategory = undefined;
							preSelectedParent = undefined;
						}}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="container mx-auto">
		<CategoryList
			categories={data.categories}
			{editable}
			onEdit={(event) => {
				selectedCategory = event;
				preSelectedParent = undefined;
				isEditCategoryDialogOpen = true;
			}}
			onDelete={confirmDeleteCategory}
			onAddSubcategory={handleAddSubcategory}
		/>
	</div>
</section>

{#if editable}
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
{/if}
