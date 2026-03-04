<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { locale, t } from 'svelte-i18n';
	import { toast } from 'svelte-sonner';
	import type { Account } from '$lib/types/account.types';
	import type { Attachment } from '$lib/types/transactions.types';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { formatAccountName } from '$lib/utils/account';
	import type { SuperForm, Infer } from 'sveltekit-superforms';
	import { createTransactionSchema } from '$lib/schemas/transaction.schema';
	import FileUploadZone from '$lib/components/file-upload-zone.svelte';
	import AttachmentList from '$lib/components/attachment-list.svelte';
	import X from '@lucide/svelte/icons/x';
	import Paperclip from '@lucide/svelte/icons/paperclip';

	type TransactionFormData = Infer<typeof createTransactionSchema>;

	const MAX_ATTACHMENTS = 5;

	let {
		form,
		formData = $bindable(),
		enhance,
		accounts,
		pendingFiles = $bindable<File[]>([])
	}: {
		form: SuperForm<TransactionFormData>;
		formData: TransactionFormData;
		enhance: SuperForm<TransactionFormData>['enhance'];
		accounts: Account[];
		pendingFiles?: File[];
	} = $props();

	let attachments = $state<Attachment[]>([]);
	let uploading = $state(false);
	let transactionId = $derived(formData.id);
	let isEditing = $derived(!!transactionId);
	let canUpload = $derived(attachments.length + pendingFiles.length < MAX_ATTACHMENTS);

	$effect(() => {
		if (transactionId) {
			loadAttachments(transactionId);
		} else {
			attachments = [];
		}
	});

	async function loadAttachments(transactionId: string) {
		try {
			const response = await fetch(`/api/transactions/${transactionId}/attachments`);
			if (response.ok) {
				attachments = await response.json();
			}
		} catch {
			// Silently fail - attachments are non-critical
		}
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function handleRemovePendingFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
	}

	async function handleFileSelect(file: File) {
		if (!formData.id) {
			pendingFiles = [...pendingFiles, file];
			return;
		}
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const response = await fetch(`/api/transactions/${formData.id}/attachments`, {
				method: 'POST',
				body: fd
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || 'Upload failed');
			}
			const newAttachment: Attachment = await response.json();
			attachments = [...attachments, newAttachment];
			toast.success($t('transactions.attachments.uploadSuccess'));
		} catch {
			toast.error($t('transactions.attachments.uploadError'));
		} finally {
			uploading = false;
		}
	}

	async function handleDeleteAttachment(attachment: Attachment) {
		if (!formData.id) return;
		try {
			const response = await fetch(
				`/api/transactions/${formData.id}/attachments/${attachment.id}`,
				{ method: 'DELETE' }
			);
			if (!response.ok) throw new Error();
			attachments = attachments.filter((a) => a.id !== attachment.id);
			toast.success($t('transactions.attachments.deleteSuccess'));
		} catch {
			toast.error($t('transactions.attachments.deleteError'));
		}
	}

	const df = new DateFormatter($locale || 'en-US', {
		dateStyle: 'long'
	});
	formData.date = formData.date || today(getLocalTimeZone()).toString();
	let date: CalendarDate | undefined = $state(parseDate(formData.date));
	let contentRef = $state<HTMLElement | null>(null);
</script>

<form id="addTransactionForm" class="space-y-4" method="POST" action="?/addTransaction" use:enhance>
	<input hidden name="id" value={formData.id || ''} />
	<Form.Field {form} name="account">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.account')}</Form.Label>
				<Select.Root type="single" bind:value={formData.account} name={props.name}>
					<Select.Trigger class="w-full" {...props}>
						{formData.account
							? formatAccountName(
									accounts.find((account: Account) => account.id === formData.account)!
								)
							: $t('transactions.accountPlaceholder')}
					</Select.Trigger>
					<Select.Content>
						{#each accounts as account (account.id)}
							<Select.Item value={account.id}>{formatAccountName(account)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="amount">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.amount')}</Form.Label>
				<Input
					type="number"
					step="0.01"
					placeholder={$t('transactions.amountPlaceholder')}
					{...props}
					bind:value={formData.amount}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="date">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.date')}</Form.Label>
				<Popover.Root>
					<Popover.Trigger
						class={cn(
							buttonVariants({
								variant: 'outline',
								class: 'w-full justify-start text-left font-normal'
							}),
							!date && 'text-muted-foreground'
						)}
						{...props}
					>
						<CalendarIcon />
						{date ? df.format(date.toDate(getLocalTimeZone())) : $t('transactions.pickADate')}
					</Popover.Trigger>
					<Popover.Content bind:ref={contentRef} class="w-auto p-0">
						<Calendar
							type="single"
							locale={$locale || 'en-US'}
							value={date}
							onValueChange={(v) => {
								if (v) {
									formData.date = v.toString();
									date = parseDate(formData.date);
								} else {
									formData.date = '';
									date = undefined;
								}
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<input hidden value={formData.date} name={props.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="description">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.descriptionField')}</Form.Label>
				<Input
					type="text"
					placeholder={$t('transactions.descriptionPlaceholder')}
					{...props}
					bind:value={formData.description}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="notes">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.notes')}</Form.Label>
				<Textarea
					placeholder={$t('transactions.notesPlaceholder')}
					{...props}
					bind:value={formData.notes}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
</form>

<div class="space-y-3 pt-2">
	{#if isEditing}
		<AttachmentList
			{attachments}
			transactionId={formData.id || ''}
			editable={true}
			onDelete={handleDeleteAttachment}
		/>
	{/if}
	{#if pendingFiles.length > 0}
		<ul class="space-y-1">
			{#each pendingFiles as file, index (index)}
				<li class="bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm">
					<Paperclip class="text-muted-foreground h-4 w-4 shrink-0" />
					<span class="min-w-0 flex-1 truncate">{file.name}</span>
					<span class="text-muted-foreground shrink-0 text-xs">{formatFileSize(file.size)}</span>
					<button
						type="button"
						class="text-muted-foreground hover:text-destructive shrink-0"
						onclick={() => handleRemovePendingFile(index)}
					>
						<X class="h-4 w-4" />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if canUpload}
		<FileUploadZone {uploading} onFileSelect={handleFileSelect} />
	{:else}
		<p class="text-muted-foreground text-sm">
			{$t('transactions.attachments.maxAttachments', {
				values: { max: MAX_ATTACHMENTS }
			})}
		</p>
	{/if}
</div>
