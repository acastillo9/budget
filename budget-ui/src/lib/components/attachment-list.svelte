<script lang="ts">
	import { Trash2, Download, Loader2 } from '@lucide/svelte';
	import { t } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import type { Attachment } from '$lib/types/transactions.types';
	import AttachmentThumbnail from './attachment-thumbnail.svelte';
	import Button from './ui/button/button.svelte';
	import ConfirmationDialog from './confirmation-dialog.svelte';

	let {
		attachments = [],
		transactionId,
		editable = false,
		onDelete
	}: {
		attachments: Attachment[];
		transactionId: string;
		editable?: boolean;
		onDelete?: (attachment: Attachment) => void;
	} = $props();

	let confirmDialog = $state({
		open: false,
		loading: false,
		attachment: null as Attachment | null
	});

	let downloadingId = $state<string | null>(null);

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function handleDownload(attachment: Attachment) {
		downloadingId = attachment.id;
		try {
			const response = await fetch(
				`/api/transactions/${transactionId}/attachments/${attachment.id}`
			);
			if (!response.ok) throw new Error();
			const { url } = await response.json();
			window.open(url, '_blank');
		} catch {
			toast.error($t('transactions.attachments.downloadError'));
		} finally {
			downloadingId = null;
		}
	}

	function confirmDelete(attachment: Attachment) {
		confirmDialog = { open: true, loading: false, attachment };
	}

	function handleConfirmDelete() {
		if (confirmDialog.attachment && onDelete) {
			onDelete(confirmDialog.attachment);
		}
		confirmDialog = { open: false, loading: false, attachment: null };
	}
</script>

{#if attachments.length > 0}
	<div class="space-y-2">
		<h4 class="text-sm font-medium">{$t('transactions.attachments.title')}</h4>
		<div class="space-y-1.5">
			{#each attachments as attachment (attachment.id)}
				<div class="bg-muted/50 flex items-center gap-3 rounded-md border px-3 py-2">
					<AttachmentThumbnail {attachment} size="sm" />

					<div class="flex min-w-0 flex-1 flex-col">
						<p class="truncate text-sm font-medium">{attachment.filename}</p>
						<p class="text-muted-foreground text-xs">
							{formatFileSize(attachment.size)}
						</p>
					</div>

					<div class="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							class="h-7 w-7"
							onclick={() => handleDownload(attachment)}
							disabled={downloadingId === attachment.id}
						>
							{#if downloadingId === attachment.id}
								<Loader2 class="h-3.5 w-3.5 animate-spin" />
							{:else}
								<Download class="h-3.5 w-3.5" />
							{/if}
						</Button>
						{#if editable}
							<Button
								variant="ghost"
								size="icon"
								class="text-destructive hover:text-destructive h-7 w-7"
								onclick={() => confirmDelete(attachment)}
							>
								<Trash2 class="h-3.5 w-3.5" />
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}

<ConfirmationDialog
	open={confirmDialog.open}
	onOpenChange={(open) => {
		if (!open) confirmDialog = { open: false, loading: false, attachment: null };
	}}
	title={$t('transactions.attachments.deleteTitle')}
	description={$t('transactions.attachments.deleteDescription', {
		values: { filename: confirmDialog.attachment?.filename ?? '' }
	})}
	loading={confirmDialog.loading}
	onConfirm={handleConfirmDelete}
/>
