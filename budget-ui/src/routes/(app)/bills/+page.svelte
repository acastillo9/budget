<script lang="ts">
	import { t, locale } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import BillList from '$lib/components/bill-list.svelte';
	import CreateBillDialog from '$lib/components/create-bill-wizard/create-bill-dialog.svelte';
	import type { Bill } from '$lib/types/bill.types';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Calendar1, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import Switch from '$lib/components/ui/switch/switch.svelte';
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
		goto('/bills', { replaceState: false, noScroll: true });
	}

	let isEditBillDialogOpen = $state(false);
	let selectedBillItem: Bill | undefined = $state(undefined);
	let isPaying: string | undefined = $state(undefined);
	let isUnpaying: string | undefined = $state(undefined);
	let deleteSeries = $state(false);

	async function payBill(bill: Bill) {
		isPaying = bill.id;
		const targetDate = bill.targetDate || bill.dueDate;
		try {
			const response = await fetch(`/api/bills/${bill.id}/${targetDate.split('T')[0]}/pay`, {
				method: 'POST',
				body: JSON.stringify({
					paidDate: new Date().toISOString().split('T')[0]
				})
			});

			if (!response.ok) {
				throw new Error('Failed to pay bill');
			}

			toast.success($t('bills.billPaidSuccess'));

			invalidateAll();
		} catch {
			toast.error($t('bills.billPaidError'));
		} finally {
			isPaying = undefined;
		}
	}

	async function unpayBill(bill: Bill) {
		isUnpaying = bill.id;
		const targetDate = bill.targetDate || bill.dueDate;
		try {
			const response = await fetch(`/api/bills/${bill.id}/${targetDate.split('T')[0]}/unpay`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to unpay bill');
			}

			toast.success($t('bills.billUnpaidSuccess'));

			invalidateAll();
		} catch {
			toast.error($t('bills.billUnpaidError'));
		} finally {
			isUnpaying = undefined;
		}
	}

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	const confirmDeleteBill = (bill: Bill) => {
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('bills.deleteBillTitle'),
			description: $t('bills.deleteBillDescription', {
				values: { name: bill.name }
			}),
			onConfirm: () => {
				deleteBill(bill);
			}
		};
	};

	async function deleteBill(bill: Bill) {
		confirmationDialog.loading = true;
		const targetDate = bill.targetDate || bill.dueDate;
		try {
			const uri = `/api/bills/${bill.id}/${targetDate.split('T')[0]}`;
			const response = await fetch(uri, {
				method: 'DELETE',
				body: JSON.stringify({
					applyToFuture: deleteSeries
				})
			});

			if (!response.ok) {
				throw new Error('Failed to delete bill');
			}

			confirmationDialog = {
				open: false,
				loading: false,
				title: '',
				description: '',
				onConfirm: () => {}
			};

			toast.success($t('bills.deleteBillSuccess'));

			invalidateAll();
		} catch {
			toast.error($t('bills.deleteBillError'));
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('bills.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('bills.title')}</h1>
				<p class="text-muted-foreground">{$t('bills.description')}</p>
			</div>

			<div class="flex items-center space-x-2">
				<CreateBillDialog
					addBillForm={data.createBillForm}
					createCategoryForm={data.createCategoryForm}
					accounts={data.accounts}
					categories={data.categories}
					bill={selectedBillItem}
					bind:open={isEditBillDialogOpen}
					onClose={() => {
						selectedBillItem = undefined;
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
						aria-label={$t('bills.previousMonth')}
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
								{$t('bills.goToCurrentMonth')}
							</Button>
						{/if}
					</div>

					<Button
						variant="ghost"
						size="icon"
						onclick={() => navigateMonth('next')}
						aria-label={$t('bills.nextMonth')}
					>
						<ChevronRight class="h-5 w-5" />
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
	<div class="container mx-auto">
		<BillList
			bills={data.bills}
			headless
			{isCurrentMonth}
			payBill={(e) => payBill(e)}
			unpayBill={(e) => unpayBill(e)}
			isPayingBill={isPaying}
			isUnpayingBill={isUnpaying}
			onEdit={(event) => {
				selectedBillItem = event;
				isEditBillDialogOpen = true;
			}}
			onDelete={confirmDeleteBill}
		></BillList>
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
>
	<Card.Root class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-sm">
				<Calendar1 class="h-4 w-4" />
				{$t('bills.deleteScope')}
			</Card.Title>
			<Card.Description class="text-xs">{$t('bills.deleteScopeDescription')}</Card.Description>
		</Card.Header>
		<Card.Content class="pt-0">
			<div class="flex items-center justify-between space-x-4">
				<div class="flex-1">
					<Label class="text-sm font-medium">
						{!deleteSeries ? $t('bills.deleteSingleLabel') : $t('bills.deleteSeriesLabel')}
					</Label>
					<p class="text-muted-foreground mt-1 text-xs">
						{!deleteSeries
							? $t('bills.deleteSingleDescription')
							: $t('bills.deleteSeriesDescription')}
					</p>
				</div>
				<Switch bind:checked={deleteSeries} />
			</div>
		</Card.Content>
	</Card.Root>
</ConfirmationDialog>
