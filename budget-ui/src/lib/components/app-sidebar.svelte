<script lang="ts" module>
	import CircleGaugeIcon from '@lucide/svelte/icons/circle-gauge';
	import Building_2Icon from '@lucide/svelte/icons/building-2';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import TagsIcon from '@lucide/svelte/icons/tags';

	const data = {
		navMain: [
			{
				id: 'dashboard',
				translationKey: 'sidebar.dashboard',
				url: '/',
				icon: CircleGaugeIcon
			},
			{
				id: 'accounts',
				translationKey: 'sidebar.accounts',
				url: '/accounts',
				icon: Building_2Icon
			},
			{
				id: 'categories',
				translationKey: 'sidebar.categories',
				url: '/categories',
				icon: TagsIcon
			},
			{
				id: 'transactions',
				translationKey: 'sidebar.transactions',
				url: '/transactions',
				icon: ReceiptIcon
			},
			{
				id: 'bills',
				translationKey: 'sidebar.bills',
				url: '/bills',
				icon: CalendarIcon
			},
			{
				id: 'budgets',
				translationKey: 'sidebar.budgets',
				url: '/budgets',
				icon: TrendingDownIcon
			}
		]
	};
</script>

<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import WorkspaceSwitcher from './workspace-switcher.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { getUserContext } from '$lib/context';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	const userState = getUserContext();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header>
		<WorkspaceSwitcher
			workspaces={userState.workspaces}
			currentWorkspace={userState.currentWorkspace}
		/>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if userState.user}
			<NavUser user={userState.user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
