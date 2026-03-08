<script lang="ts">
	import { formatCurrencyWithSymbol } from '$lib/utils/currency';
	import {
		ArrowDownLeft,
		ArrowUpRight,
		ArrowRightLeft,
		Calendar,
		Edit,
		FileText,
		Paperclip,
		Trash2
	} from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import CategoryBadge from './category-badge.svelte';
	import CreatedByBadge from './created-by-badge.svelte';
	import AttachmentList from './attachment-list.svelte';
	import Button from './ui/button/button.svelte';
	import Skeleton from './ui/skeleton/skeleton.svelte';
	import { t } from 'svelte-i18n';
	import { getUserContext } from '$lib/context';
	import Badge from './ui/badge/badge.svelte';
	import { formatUTCStringDateWithLocal, formatDateTimeLocal } from '$lib/utils/date';
	import type { Transaction, Attachment } from '$lib/types/transactions.types';
	import type { Rates } from '$lib/types';

	let {
		transaction,
		rates,
		editable = false,
		expanded = false,
		onToggleExpand,
		fetchAttachments,
		onEdit,
		onDelete
	}: {
		transaction: Transaction;
		rates: Rates;
		editable?: boolean;
		expanded?: boolean;
		onToggleExpand?: () => void;
		fetchAttachments?: (transactionId: string) => Promise<Attachment[]>;
		onEdit?: (event: MouseEvent) => void;
		onDelete?: (event: MouseEvent) => void;
	} = $props();

	let isIncome = $derived(transaction.amount > 0);
	let description = $derived.by(() => {
		if (transaction.isTransfer) {
			const descriptionTranslation =
				transaction.amount < 0
					? 'transactions.descriptionTransferTo'
					: 'transactions.descriptionTransferFrom';
			return $t(descriptionTranslation, {
				values: {
					account: transaction.transfer?.account.name || $t('accounts.deletedAccount'),
					description: transaction.transfer?.description || '--'
				}
			});
		} else {
			return transaction.description;
		}
	});

	let hasDetails = $derived(
		!!transaction.notes ||
			(transaction.attachmentCount && transaction.attachmentCount > 0) ||
			transaction.createdAt
	);

	let showUpdatedAt = $derived(
		transaction.updatedAt &&
			transaction.createdAt &&
			transaction.updatedAt !== transaction.createdAt
	);

	let attachments = $state<Attachment[]>([]);
	let attachmentsLoading = $state(false);
	let attachmentsError = $state(false);

	$effect(() => {
		if (
			expanded &&
			transaction.attachmentCount &&
			transaction.attachmentCount > 0 &&
			fetchAttachments &&
			attachments.length === 0 &&
			!attachmentsLoading
		) {
			loadAttachments();
		}
	});

	async function loadAttachments() {
		if (!fetchAttachments) return;
		attachmentsLoading = true;
		attachmentsError = false;
		try {
			attachments = await fetchAttachments(transaction.id);
		} catch {
			attachmentsError = true;
		} finally {
			attachmentsLoading = false;
		}
	}

	const userState = getUserContext();
</script>

<div class="border-b last:border-0">
	<div
		class="flex items-center justify-between gap-4 py-3 {hasDetails ? 'cursor-pointer' : ''}"
		role="button"
		tabindex={0}
		aria-expanded={hasDetails ? expanded : undefined}
		aria-disabled={!hasDetails}
		onclick={() => hasDetails && onToggleExpand?.()}
		onkeydown={(e) => {
			if (hasDetails && (e.key === 'Enter' || e.key === ' ')) {
				e.preventDefault();
				onToggleExpand?.();
			}
		}}
	>
		<div class="flex w-full items-center gap-4">
			<div class={`rounded-full p-2 ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
				{#if isIncome}
					<ArrowUpRight class="h-4 w-4 text-green-600" />
				{:else}
					<ArrowDownLeft class="h-4 w-4 text-red-600" />
				{/if}
			</div>

			<div
				class="flex w-full flex-col items-start gap-2 md:flex-row md:items-center md:justify-between"
			>
				<div class="flex flex-col gap-1">
					<p class="font-medium">{description}</p>
					<div class="flex flex-wrap gap-1">
						<Badge variant="outline">
							{formatUTCStringDateWithLocal(transaction.date)}
						</Badge>
						<Badge>
							{transaction.account.name}
						</Badge>
						{#if transaction.category}
							<CategoryBadge category={transaction.category} />
						{/if}
						{#if transaction.user}
							<CreatedByBadge userName={transaction.user.name} />
						{/if}
						{#if transaction.attachmentCount && transaction.attachmentCount > 0}
							<Badge variant="outline" class="gap-1">
								<Paperclip class="h-3 w-3" />
								{transaction.attachmentCount}
							</Badge>
						{/if}
					</div>
				</div>

				<div class="flex flex-col md:text-right">
					<p class={`font-semibold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
						{#if transaction.account.currencyCode !== userState.user?.currencyCode}
							<span>{transaction.account.currencyCode}</span>
						{/if}
						{formatCurrencyWithSymbol(transaction.amount, transaction.account.currencyCode)}
					</p>
					{#if transaction.account.currencyCode !== userState.user?.currencyCode}
						<p class="text-muted-foreground mt-1 text-xs break-words">
							≈ {userState.user?.currencyCode || 'USD'}
							{formatCurrencyWithSymbol(
								transaction.amount / rates[transaction.account.currencyCode].rate,
								userState.user?.currencyCode || 'USD'
							)}
						</p>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if editable}
				<div class="flex items-center gap-2">
					{#if !transaction.isTransfer || (transaction.isTransfer && transaction.transfer)}
						<Button
							variant="ghost"
							size="icon"
							onclick={(e) => {
								e.stopPropagation();
								onEdit?.(e);
							}}
						>
							<Edit class="h-4 w-4" />
						</Button>
					{/if}
					<Button
						variant="ghost"
						size="icon"
						onclick={(e) => {
							e.stopPropagation();
							onDelete?.(e);
						}}
						class="text-destructive hover:text-destructive"
					>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		</div>
	</div>

	{#if expanded}
		<div class="text-muted-foreground pb-3 pl-12 text-sm" transition:slide={{ duration: 200 }}>
			<div class="flex flex-col gap-3">
				{#if transaction.notes}
					<div class="flex items-start gap-2">
						<FileText class="mt-0.5 h-4 w-4 shrink-0" />
						<div>
							<p class="text-foreground text-xs font-medium">
								{$t('transactions.detail.notes')}
							</p>
							<p class="whitespace-pre-wrap">{transaction.notes}</p>
						</div>
					</div>
				{/if}

				{#if transaction.attachmentCount && transaction.attachmentCount > 0}
					<div
						class="flex items-start gap-2"
						role="presentation"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => e.stopPropagation()}
					>
						<Paperclip class="mt-0.5 h-4 w-4 shrink-0" />
						<div class="w-full">
							<p class="text-foreground mb-1 text-xs font-medium">
								{$t('transactions.detail.attachments')}
							</p>
							{#if attachmentsLoading}
								<div class="space-y-2">
									<Skeleton class="h-10 w-full" />
									<Skeleton class="h-10 w-3/4" />
								</div>
							{:else if attachmentsError}
								<button
									class="text-destructive cursor-pointer text-xs hover:underline"
									onclick={loadAttachments}
								>
									{$t('transactions.detail.loadAttachmentsError')}
								</button>
							{:else}
								<AttachmentList {attachments} transactionId={transaction.id} editable={false} />
							{/if}
						</div>
					</div>
				{/if}

				{#if transaction.isTransfer && transaction.transfer}
					<div class="flex items-center gap-2">
						<ArrowRightLeft class="h-4 w-4 shrink-0" />
						<div>
							<p class="text-foreground text-xs font-medium">
								{$t('transactions.detail.transferLinkedAccount')}
							</p>
							<p>{transaction.transfer.account.name}</p>
						</div>
					</div>
				{/if}

				{#if transaction.createdAt}
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4 shrink-0" />
						<div class="flex flex-wrap gap-x-4 gap-y-1">
							<div>
								<span class="text-foreground text-xs font-medium">
									{$t('transactions.detail.createdAt')}:
								</span>
								<span>{formatDateTimeLocal(transaction.createdAt)}</span>
							</div>
							{#if showUpdatedAt}
								<div>
									<span class="text-foreground text-xs font-medium">
										{$t('transactions.detail.updatedAt')}:
									</span>
									<span>{formatDateTimeLocal(transaction.updatedAt)}</span>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
