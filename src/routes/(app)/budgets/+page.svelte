<script lang="ts">
	import { t, locale } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import BudgetList from '$lib/components/budget-list.svelte';
	import CreateBudgetDialog from '$lib/components/create-budget-dialog.svelte';
	import type { BudgetProgress } from '$lib/types/budget.types';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import * as Card from '$lib/components/ui/card';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	let { data }: PageProps = $props();

	// Month navigation
	let selectedMonth = $derived(data.selectedMonth);

	const currentMonthKey = $derived(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	});

	const isCurrentMonth = $derived(selectedMonth === currentMonthKey());

	const formattedMonthYear = $derived(() => {
		const [year, month] = selectedMonth.split('-').map(Number);
		const date = new Date(year, month - 1, 1);
		return date.toLocaleDateString($locale ?? 'en', {
			month: 'long',
			year: 'numeric'
		});
	});

	function navigateMonth(direction: 'prev' | 'next') {
		const [year, month] = selectedMonth.split('-').map(Number);
		const newDate = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
		const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
		goto(`?month=${newMonth}`, { replaceState: false, noScroll: true });
	}

	function goToCurrentMonth() {
		goto('/budgets', { replaceState: false, noScroll: true });
	}

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
					createCategoryForm={data.createCategoryForm}
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

	<!-- Month Selector -->
	<div class="container mx-auto">
		<Card.Root>
			<Card.Content class="py-3">
				<div class="flex items-center justify-between">
					<Button
						variant="ghost"
						size="icon"
						onclick={() => navigateMonth('prev')}
						aria-label={$t('budgets.previousMonth')}
					>
						<ChevronLeft class="h-5 w-5" />
					</Button>

					<div class="flex flex-col items-center gap-1">
						<span class="text-2xl font-bold capitalize">{formattedMonthYear()}</span>
						{#if !isCurrentMonth}
							<Button
								variant="link"
								size="sm"
								class="text-muted-foreground h-auto p-0 text-xs"
								onclick={goToCurrentMonth}
							>
								{$t('budgets.goToCurrentMonth')}
							</Button>
						{/if}
					</div>

					<Button
						variant="ghost"
						size="icon"
						onclick={() => navigateMonth('next')}
						aria-label={$t('budgets.nextMonth')}
					>
						<ChevronRight class="h-5 w-5" />
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
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
