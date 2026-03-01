<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { page } from '$app/state';
	import { t } from 'svelte-i18n';

	let {
		items
	}: {
		items: {
			id: string;
			translationKey: string;
			url: string;
			// this should be `Component` after @lucide/svelte updates types
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			icon?: any;
		}[];
	} = $props();

	let routeId = $derived(page.route.id?.split('/')[2] || 'dashboard');

	const sidebar = useSidebar();

	function handleClick() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>{$t('sidebar.navigation')}</Sidebar.GroupLabel>
	<Sidebar.Menu>
		{#each items as item (item.id)}
			<Sidebar.MenuItem>
				<Sidebar.MenuButton isActive={item.id === routeId} tooltipContent={$t(item.translationKey)}>
					{#snippet child({ props })}
						<a href={item.url} {...props} onclick={handleClick}>
							<item.icon />
							<span>{$t(item.translationKey)}</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>
