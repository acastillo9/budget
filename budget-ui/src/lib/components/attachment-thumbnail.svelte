<script lang="ts">
	import { FileText, Image } from '@lucide/svelte';
	import type { Attachment } from '$lib/types/transactions.types';

	let {
		attachment,
		size = 'sm'
	}: {
		attachment: Attachment;
		size?: 'sm' | 'md';
	} = $props();

	let isImage = $derived(attachment.mimeType.startsWith('image/'));
	let iconSize = $derived(size === 'sm' ? 'h-4 w-4' : 'h-6 w-6');
	let containerSize = $derived(size === 'sm' ? 'h-8 w-8' : 'h-12 w-12');
	let textSize = $derived(size === 'sm' ? 'text-[9px]' : 'text-xs');
</script>

<div
	class="bg-muted flex items-center justify-center rounded-md {containerSize} shrink-0"
	title={attachment.filename}
>
	{#if isImage}
		<Image class="{iconSize} text-blue-500" />
	{:else}
		<div class="flex flex-col items-center">
			<FileText class="{iconSize} text-red-500" />
			<span class="{textSize} font-bold text-red-500">PDF</span>
		</div>
	{/if}
</div>
