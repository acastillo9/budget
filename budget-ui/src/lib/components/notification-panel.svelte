<script lang="ts">
	import type { PaginatedNotifications, Notification } from '$lib/types/notification.types';
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import NotificationItem from './notification-item.svelte';
	import CheckCheck from '@lucide/svelte/icons/check-check';
	import Settings from '@lucide/svelte/icons/settings';
	import Bell from '@lucide/svelte/icons/bell';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { t } from 'svelte-i18n';

	interface Props {
		open: boolean;
		notifications: PaginatedNotifications;
		loading: boolean;
		onMarkAsRead: (id: string) => void;
		onMarkAllAsRead: () => void;
		onDelete: (id: string) => void;
		onLoadMore: () => void;
		onOpenPreferences: () => void;
		onNotificationClick: (notification: Notification) => void;
	}

	let {
		open = $bindable(false),
		notifications,
		loading,
		onMarkAsRead,
		onMarkAllAsRead,
		onDelete,
		onLoadMore,
		onOpenPreferences,
		onNotificationClick
	}: Props = $props();

	let hasMore = $derived(notifications.nextPage !== null);

	function handleNotificationClick(notification: Notification) {
		if (!notification.isRead) {
			onMarkAsRead(notification.id);
		}
		onNotificationClick(notification);
	}
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="flex w-full flex-col sm:max-w-md">
		<Sheet.Header class="border-b px-4 pb-3">
			<div class="flex items-center justify-between">
				<Sheet.Title>{$t('notifications.title')}</Sheet.Title>
				<div class="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={onMarkAllAsRead}
						aria-label={$t('notifications.markAllRead')}
					>
						<CheckCheck class="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={onOpenPreferences}
						aria-label={$t('notifications.preferences')}
					>
						<Settings class="h-4 w-4" />
					</Button>
				</div>
			</div>
			<Sheet.Description class="sr-only">{$t('notifications.title')}</Sheet.Description>
		</Sheet.Header>

		<div class="flex-1 overflow-y-auto">
			{#if loading && notifications.data.length === 0}
				<div class="flex items-center justify-center py-12">
					<LoaderCircle class="text-muted-foreground h-6 w-6 animate-spin" />
				</div>
			{:else if notifications.data.length === 0}
				<div class="flex flex-col items-center justify-center gap-3 py-12">
					<Bell class="text-muted-foreground h-10 w-10" />
					<p class="text-muted-foreground text-sm">{$t('notifications.noNotifications')}</p>
				</div>
			{:else}
				{#each notifications.data as notification (notification.id)}
					<NotificationItem {notification} onclick={handleNotificationClick} {onDelete} />
				{/each}

				{#if hasMore}
					<div class="p-4">
						<Button variant="outline" class="w-full" onclick={onLoadMore} disabled={loading}>
							{#if loading}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{$t('notifications.loadMore')}
						</Button>
					</div>
				{/if}
			{/if}
		</div>
	</Sheet.Content>
</Sheet.Root>
