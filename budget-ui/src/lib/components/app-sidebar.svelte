<script lang="ts" module>
	import CircleGaugeIcon from '@lucide/svelte/icons/circle-gauge';
	import Building_2Icon from '@lucide/svelte/icons/building-2';
	import ReceiptIcon from '@lucide/svelte/icons/receipt';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import TagsIcon from '@lucide/svelte/icons/tags';

	const data = {
		navMain: [
			{
				id: 'dashboard',
				title: 'Dashboard',
				url: '/',
				icon: CircleGaugeIcon
			},
			{
				id: 'accounts',
				title: 'Accounts',
				url: '/accounts',
				icon: Building_2Icon
			},
			{
				id: 'categories',
				title: 'Categories',
				url: '/categories',
				icon: TagsIcon
			},
			{
				id: 'transactions',
				title: 'Transactions',
				url: '/transactions',
				icon: ReceiptIcon
			},
			{
				id: 'bills',
				title: 'Bills',
				url: '/bills',
				icon: CalendarIcon
			},
			{
				id: 'budgets',
				title: 'Budgets',
				url: '/budgets',
				icon: TrendingDownIcon
			}
		]
	};
</script>

<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
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
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								<WalletIcon class="size-4" />
							</div>
							<div class="flex flex-col gap-0.5 leading-none">
								<span class="font-cursive text-3xl font-medium">Budget</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>
	<Sidebar.Content>
		<NavMain items={data.navMain} />
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser user={userState.user!} />
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
