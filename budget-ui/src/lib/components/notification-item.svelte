<script lang="ts">
	import type { Notification, NotificationType } from '$lib/types/notification.types';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Clock from '@lucide/svelte/icons/clock';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import AlertOctagon from '@lucide/svelte/icons/octagon-alert';
	import Wallet from '@lucide/svelte/icons/wallet';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import CalendarX from '@lucide/svelte/icons/calendar-x';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import Bell from '@lucide/svelte/icons/bell';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { Button } from '$lib/components/ui/button/index.js';
	import dayjs from 'dayjs';
	import '$lib/utils/date';
	import type { Component } from 'svelte';

	interface Props {
		notification: Notification;
		onclick: (notification: Notification) => void;
		onDelete: (id: string) => void;
	}

	let { notification, onclick, onDelete }: Props = $props();

	const iconMap: Record<NotificationType, Component> = {
		BILL_OVERDUE: AlertTriangle,
		BILL_DUE_SOON: Clock,
		BUDGET_THRESHOLD: TrendingUp,
		BUDGET_EXCEEDED: AlertOctagon,
		LOW_BALANCE: Wallet,
		LARGE_TRANSACTION: DollarSign,
		RECURRING_BILL_ENDING: CalendarX,
		WORKSPACE_INVITATION: UserPlus,
		MONTHLY_SUMMARY: BarChart3
	};

	let IconComponent = $derived(iconMap[notification.type] || Bell);
	let timeAgo = $derived(dayjs(notification.createdAt).fromNow());

	function handleClick() {
		onclick(notification);
	}

	function handleDelete(e: Event) {
		e.stopPropagation();
		onDelete(notification.id);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="hover:bg-accent group flex cursor-pointer gap-3 border-b px-4 py-3 transition-colors {notification.isRead
		? 'opacity-70'
		: 'bg-accent/50'}"
	onclick={handleClick}
>
	<div class="mt-0.5 flex-shrink-0">
		<div
			class="flex h-8 w-8 items-center justify-center rounded-full {notification.isRead
				? 'bg-muted'
				: 'bg-primary/10'}"
		>
			<IconComponent
				class="h-4 w-4 {notification.isRead ? 'text-muted-foreground' : 'text-primary'}"
			/>
		</div>
	</div>
	<div class="min-w-0 flex-1">
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm font-medium {notification.isRead ? '' : 'font-semibold'}">
				{notification.title}
			</p>
			{#if !notification.isRead}
				<span class="bg-primary mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"></span>
			{/if}
		</div>
		<p class="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
			{notification.message}
		</p>
		<p class="text-muted-foreground mt-1 text-[10px]">
			{timeAgo}
		</p>
	</div>
	<div
		class="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100"
	>
		<Button variant="ghost" size="icon" class="h-7 w-7" onclick={handleDelete}>
			<Trash2 class="h-3.5 w-3.5" />
		</Button>
	</div>
</div>
