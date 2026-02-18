<script lang="ts">
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import BudgetList from '$lib/components/budget-list.svelte';
	import CreateBudgetDialog from '$lib/components/create-budget-dialog.svelte';
	import type { BudgetProgress } from '$lib/types/budget.types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';

	let { data }: PageProps = $props();

	let isEditBudgetDialogOpen = $state(false);
	let selectedBudget: BudgetProgress | undefined = $state(undefined);

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	const confirmDeleteBudget = (budget: BudgetProgress) => {
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('budgets.deleteBudgetTitle'),
			description: $t('budgets.deleteBudgetDescription'),
			onConfirm: () => {
				deleteBudget(budget);
			}
		};
	};

	async function deleteBudget(budget: BudgetProgress) {
		confirmationDialog.loading = true;
		try {
			const response = await fetch(`/api/budgets/${budget.budgetId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete budget');
			}

			confirmationDialog = {
				open: false,
				loading: false,
				title: '',
				description: '',
				onConfirm: () => {}
			};

			toast.success($t('budgets.deleteBudgetSuccess'));
			invalidateAll();
		} catch {
			toast.error($t('budgets.deleteBudgetError'));
			confirmationDialog.loading = false;
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('budgets.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('budgets.title')}</h1>
				<p class="text-muted-foreground">{$t('budgets.description')}</p>
			</div>

			<div class="flex items-center space-x-2">
				<CreateBudgetDialog
					addBudgetForm={data.createBudgetForm}
					categories={data.categories}
					budget={selectedBudget}
					bind:open={isEditBudgetDialogOpen}
					onClose={() => {
						selectedBudget = undefined;
					}}
				/>
			</div>
		</div>
	</div>

	<div class="container mx-auto">
		<BudgetList
			budgets={data.budgets}
			onEdit={(budget) => {
				selectedBudget = budget;
				isEditBudgetDialogOpen = true;
			}}
			onDelete={confirmDeleteBudget}
		/>
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
