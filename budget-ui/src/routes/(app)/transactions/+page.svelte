<script lang="ts">
	import type { PageProps } from './$types';
	import { t } from 'svelte-i18n';
	import CreateTransactionDialog from '$lib/components/create-transaction-wizard/create-transaction-dialog.svelte';
	import TransactionList from '$lib/components/transaction-list.svelte';
	import TransactionFilters from '$lib/components/transaction-filters.svelte';
	import type { Transaction } from '$lib/types/transactions.types';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import { toast } from 'svelte-sonner';
	import { goto, invalidateAll } from '$app/navigation';
	import * as Pagination from '$lib/components/ui/pagination/index.js';
	import { getUserContext } from '$lib/context';
	import { canEdit } from '$lib/utils/permissions';

	let { data }: PageProps = $props();

	let isEditTransactionDialogOpen = $state(false);
	let selectedTransaction: Transaction | undefined = $state(undefined);
	const userState = getUserContext();
	let editable = $derived(canEdit(userState.workspaceRole!));

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	function buildTransactionsUrl(params: {
		dateFrom?: string;
		dateTo?: string;
		categoryId?: string;
		offset?: number;
	}): string {
		const searchParams = new URLSearchParams();
		if (params.offset) searchParams.set('offset', String(params.offset));
		if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
		if (params.dateTo) searchParams.set('dateTo', params.dateTo);
		if (params.categoryId) searchParams.set('categoryId', params.categoryId);
		const qs = searchParams.toString();
		return `/transactions${qs ? `?${qs}` : ''}`;
	}

	const confirmDeleteTransaction = (transaction: Transaction) => {
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('transactions.deleteTransactionTitle'),
			description: $t('transactions.deleteTransactionDescription', {
				values: { description: transaction.description }
			}),
			onConfirm: () => {
				deleteTransaction(transaction);
			}
		};
	};

	async function deleteTransaction(transaction: Transaction) {
		confirmationDialog.loading = true;
		try {
			const uri = transaction.isTransfer
				? `/api/transactions/transfer/${transaction.id}`
				: `/api/transactions/${transaction.id}`;
			const response = await fetch(uri, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete transaction');
			}

			confirmationDialog = {
				open: false,
				loading: false,
				title: '',
				description: '',
				onConfirm: () => {}
			};

			toast.success($t('transactions.deleteTransactionSuccess'));

			invalidateAll();
		} catch {
			toast.error($t('transactions.deleteTransactionError'));
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('transactions.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('transactions.title')}</h1>
				<p class="text-muted-foreground">{$t('transactions.description')}</p>
			</div>

			{#if editable && data.accounts.length > 0}
				<div class="flex items-center space-x-2">
					<CreateTransactionDialog
						addTransactionForm={data.addTransactionForm}
						addTransferForm={data.addTransferForm}
						createCategoryForm={data.createCategoryForm}
						categories={data.categories}
						accounts={data.accounts}
						transaction={selectedTransaction}
						bind:open={isEditTransactionDialogOpen}
						onClose={() => {
							selectedTransaction = undefined;
						}}
					/>
				</div>
			{/if}
		</div>
	</div>

	<div class="container mx-auto">
		<TransactionFilters
			categories={data.categories}
			dateFrom={data.filters.dateFrom}
			dateTo={data.filters.dateTo}
			categoryId={data.filters.categoryId}
			onFilterChange={(filters) => {
				goto(
					buildTransactionsUrl({
						...filters,
						offset: 0
					}),
					{ replaceState: true }
				);
			}}
		/>
	</div>

	<div class="container mx-auto">
		<TransactionList
			transactions={data.transactions.data}
			rates={userState.currencyRates?.rates || {}}
			headless
			{editable}
			onEdit={(event) => {
				selectedTransaction = event;
				isEditTransactionDialogOpen = true;
			}}
			onDelete={confirmDeleteTransaction}
		/>
		<Pagination.Root
			count={data.transactions.total}
			perPage={data.transactions.limit}
			page={data.transactions.offset / data.transactions.limit + 1}
		>
			{#snippet children({ pages, currentPage })}
				<Pagination.Content>
					<Pagination.Item>
						<Pagination.PrevButton
							onclick={() => {
								goto(
									buildTransactionsUrl({
										...data.filters,
										offset: Math.max(data.transactions.offset - data.transactions.limit, 0)
									}),
									{ replaceState: true }
								);
							}}
						/>
					</Pagination.Item>
					{#each pages as page (page.key)}
						{#if page.type === 'ellipsis'}
							<Pagination.Item>
								<Pagination.Ellipsis />
							</Pagination.Item>
						{:else}
							<Pagination.Item>
								<Pagination.Link
									{page}
									isActive={currentPage === page.value}
									onclick={() => {
										goto(
											buildTransactionsUrl({
												...data.filters,
												offset: (page.value - 1) * data.transactions.limit
											}),
											{ replaceState: true }
										);
									}}
								>
									{page.value}
								</Pagination.Link>
							</Pagination.Item>
						{/if}
					{/each}
					<Pagination.Item>
						<Pagination.NextButton
							onclick={() => {
								goto(
									buildTransactionsUrl({
										...data.filters,
										offset: data.transactions.offset + data.transactions.limit
									}),
									{ replaceState: true }
								);
							}}
						/>
					</Pagination.Item>
				</Pagination.Content>
			{/snippet}
		</Pagination.Root>
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
