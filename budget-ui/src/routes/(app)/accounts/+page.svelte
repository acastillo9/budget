<script lang="ts">
	import { t } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import AccountList from '$lib/components/account-list.svelte';
	import AddAccountDialog from '$lib/components/add-account-dialog.svelte';
	import ConfirmationDialog from '$lib/components/confirmation-dialog.svelte';
	import type { Account } from '$lib/types/account.types';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { getUserContext } from '$lib/context';
	import * as Pagination from '$lib/components/ui/pagination';

	const PER_PAGE = 10;
	let { data }: PageProps = $props();

	let isEditAccountDialogOpen = $state(false);
	let selectedAccount: Account | undefined = $state(undefined);
	const userState = getUserContext();
	let page = $state(1);

	let confirmationDialog = $state({
		open: false,
		loading: false,
		title: '',
		description: '',
		onConfirm: () => {}
	});

	const confirmDeleteAccount = (account: Account) => {
		confirmationDialog = {
			open: true,
			loading: false,
			title: $t('accounts.deleteAccountTitle'),
			description: $t('accounts.deleteAccountDescription', {
				values: { name: account.name }
			}),
			onConfirm: () => {
				deleteAccount(account);
			}
		};
	};

	async function deleteAccount(account: Account) {
		confirmationDialog.loading = true;
		try {
			const uri = `/api/accounts/${account.id}`;
			const response = await fetch(uri, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete account');
			}

			confirmationDialog = {
				open: false,
				loading: false,
				title: '',
				description: '',
				onConfirm: () => {}
			};

			toast.success($t('accounts.deleteAccountSuccess'));

			invalidateAll();
		} catch {
			toast.error($t('accounts.deleteAccountError'));
		}
	}
</script>

<svelte:head>
	<title>Budget App - {$t('accounts.title')}</title>
</svelte:head>

<section class="flex h-full w-full flex-col gap-4 py-4 md:py-6">
	<div class="container mx-auto">
		<div class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
			<div>
				<h1 class="text-3xl font-bold">{$t('accounts.title')}</h1>
				<p class="text-muted-foreground">{$t('accounts.description')}</p>
			</div>

			<div class="flex items-center space-x-2">
				<AddAccountDialog
					data={data.addAccountForm}
					account={selectedAccount}
					accountTypes={data.accountTypes}
					bind:open={isEditAccountDialogOpen}
					onClose={() => {
						selectedAccount = undefined;
					}}
				/>
			</div>
		</div>
	</div>

	<div class="container mx-auto">
		<AccountList
			accounts={data.accounts.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
			rates={userState.currencyRates?.rates || {}}
			editable
			headless
			onDelete={confirmDeleteAccount}
			onEdit={(event) => {
				selectedAccount = event;
				isEditAccountDialogOpen = true;
			}}
		/>
		<Pagination.Root count={data.accounts.length} perPage={PER_PAGE} bind:page>
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
