<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { t } from 'svelte-i18n';
	import type { Transaction, Attachment } from '$lib/types/transactions.types';
	import { DollarSign } from '@lucide/svelte';
	import TransactionItem from './transaction-item.svelte';
	import type { Rates } from '$lib/types';

	interface Props {
		transactions: Transaction[];
		rates: Rates;
		headless?: boolean;
		editable?: boolean;
		onEdit?: (transaction: Transaction) => void;
		onDelete?: (transaction: Transaction) => void;
	}

	let {
		transactions,
		rates,
		headless = false,
		editable = false,
		onEdit = () => {},
		onDelete = () => {}
	}: Props = $props();

	let expandedTransactionId = $state<string | null>(null);
	const attachmentCache = new Map<string, Attachment[]>();

	function toggleExpand(id: string) {
		expandedTransactionId = expandedTransactionId === id ? null : id;
	}

	async function fetchAttachments(transactionId: string): Promise<Attachment[]> {
		const cached = attachmentCache.get(transactionId);
		if (cached) return cached;

		const response = await fetch(`/api/transactions/${transactionId}/attachments`);
		if (!response.ok) throw new Error('Failed to fetch attachments');
		const attachments: Attachment[] = await response.json();
		attachmentCache.set(transactionId, attachments);
		return attachments;
	}
</script>

<Card.Root class="mb-4">
	{#if !headless}
		<Card.Header>
			<Card.Title>{$t('transactions.recentTransactions')}</Card.Title>
			<Card.Description>{$t('transactions.recentTransactionsDescription')}</Card.Description>
		</Card.Header>
	{/if}
	<Card.Content>
		{#if transactions.length === 0}
			<div class="text-muted-foreground py-8 text-center">
				<DollarSign class="mx-auto mb-4 h-12 w-12 opacity-50" />
				<p>{$t('transactions.noTransactions')}</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each transactions as transaction (transaction.id)}
					<TransactionItem
						{transaction}
						{editable}
						{rates}
						expanded={expandedTransactionId === transaction.id}
						onToggleExpand={() => toggleExpand(transaction.id)}
						{fetchAttachments}
						onEdit={() => onEdit(transaction)}
						onDelete={() => onDelete(transaction)}
					/>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
