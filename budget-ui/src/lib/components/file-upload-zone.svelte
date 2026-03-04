<script lang="ts">
	import { Upload, Loader2 } from '@lucide/svelte';
	import { t } from 'svelte-i18n';

	let {
		accept = 'image/jpeg,image/png,image/webp,application/pdf',
		maxSize = 5242880,
		disabled = false,
		uploading = false,
		onFileSelect
	}: {
		accept?: string;
		maxSize?: number;
		disabled?: boolean;
		uploading?: boolean;
		onFileSelect: (file: File) => void;
	} = $props();

	let dragOver = $state(false);
	let errorMessage = $state('');
	let fileInputRef = $state<HTMLInputElement | null>(null);

	const allowedTypes = $derived(accept.split(',').map((t) => t.trim()));
	const maxSizeMB = $derived(Math.round(maxSize / 1024 / 1024));

	function validateFile(file: File): boolean {
		errorMessage = '';

		if (!allowedTypes.includes(file.type)) {
			errorMessage = $t('transactions.attachments.unsupportedType');
			return false;
		}

		if (file.size > maxSize) {
			errorMessage = $t('transactions.attachments.fileTooLarge', {
				values: { maxSize: maxSizeMB }
			});
			return false;
		}

		return true;
	}

	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file && validateFile(file)) {
			onFileSelect(file);
		}
		// Reset input so the same file can be selected again
		if (input) input.value = '';
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (disabled || uploading) return;

		const file = event.dataTransfer?.files?.[0];
		if (file && validateFile(file)) {
			onFileSelect(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (!disabled && !uploading) {
			dragOver = true;
		}
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function openFilePicker() {
		if (!disabled && !uploading && fileInputRef) {
			fileInputRef.click();
		}
	}
</script>

<div>
	<button
		type="button"
		class="border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200 {dragOver
			? 'border-primary bg-accent/60 scale-[1.01]'
			: ''} {disabled || uploading ? 'pointer-events-none opacity-50' : ''}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={openFilePicker}
		disabled={disabled || uploading}
	>
		{#if uploading}
			<Loader2 class="text-muted-foreground mb-2 h-8 w-8 animate-spin" />
			<p class="text-muted-foreground text-sm font-medium">
				{$t('transactions.attachments.uploading')}
			</p>
		{:else}
			<Upload
				class="mb-2 h-8 w-8 {dragOver ? 'text-primary' : 'text-muted-foreground'} transition-colors"
			/>
			<p class="text-muted-foreground text-sm font-medium">
				{$t('transactions.attachments.dragAndDrop')}
			</p>
			<p class="text-muted-foreground/70 mt-1 text-xs">
				{$t('transactions.attachments.supportedFormats')}
			</p>
		{/if}
	</button>

	{#if errorMessage}
		<p class="mt-2 text-sm text-red-500">{errorMessage}</p>
	{/if}

	<input
		bind:this={fileInputRef}
		type="file"
		{accept}
		class="hidden"
		onchange={handleFileInput}
		tabindex={-1}
	/>
</div>
