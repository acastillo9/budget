<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { AlertTriangle, Loader2Icon, Trash2 } from '@lucide/svelte';
	import { t } from 'svelte-i18n';
	import { buttonVariants } from './ui/button';
	import type { Snippet } from 'svelte';

	type Props = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		title: string;
		description: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'destructive' | 'default';
		loading: boolean;
		onConfirm: () => void;
		children?: Snippet;
	};

	let {
		open,
		onOpenChange,
		title,
		description,
		confirmText = $t('common.confirm'),
		cancelText = $t('common.cancel'),
		variant = 'destructive',
		loading = false,
		onConfirm,
		children
	}: Props = $props();

	const handleConfirm = () => {
		onConfirm();
		onOpenChange(false);
	};
</script>

<AlertDialog.Root {open} {onOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<div class="flex items-center gap-3">
				{#if variant === 'destructive'}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
						<AlertTriangle class="h-5 w-5 text-red-600" />
					</div>
				{:else}
					<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
						<Trash2 class="h-5 w-5 text-blue-600" />
					</div>
				{/if}
				<div>
					<AlertDialog.Title>{title}</AlertDialog.Title>
				</div>
			</div>
			<AlertDialog.Description class="mt-2">{description}</AlertDialog.Description>
		</AlertDialog.Header>
		{@render children?.()}
		<AlertDialog.Footer>
			<AlertDialog.Cancel>{cancelText}</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleConfirm}
				class={buttonVariants({ variant })}
				disabled={loading}
			>
				{#if loading}
					<Loader2Icon class="animate-spin" />
				{/if}
				{confirmText}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
