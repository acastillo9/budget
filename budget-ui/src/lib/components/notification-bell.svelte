<script lang="ts">
	import Bell from '@lucide/svelte/icons/bell';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from 'svelte-i18n';

	interface Props {
		unreadCount: number;
		onclick: () => void;
	}

	let { unreadCount, onclick }: Props = $props();

	let displayCount = $derived(unreadCount > 99 ? '99+' : String(unreadCount));
</script>

<Button variant="outline" size="icon" class="relative" {onclick} aria-label={$t('notifications.title')}>
	<Bell class="h-5 w-5" />
	{#if unreadCount > 0}
		<span
			class="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
		>
			{displayCount}
		</span>
	{/if}
</Button>
