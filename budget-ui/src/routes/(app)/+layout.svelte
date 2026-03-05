<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import Footer from '$lib/components/footer.svelte';
	import { setUserContext } from '$lib/context.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { page } from '$app/state';
	import { getBreadcrumbs } from '$lib/utils/breadcrumb.js';
	import { t } from 'svelte-i18n';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import CurrencySelector from '$lib/components/currency-selector.svelte';
	import NotificationBell from '$lib/components/notification-bell.svelte';
	import NotificationPanel from '$lib/components/notification-panel.svelte';
	import NotificationPreferencesDialog from '$lib/components/notification-preferences-dialog.svelte';
	import { untrack } from 'svelte';
	import { userState, syncUserState } from '$lib/states/user.svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import type {
		PaginatedNotifications,
		NotificationPreference,
		Notification,
		UpdateNotificationPreference
	} from '$lib/types/notification.types';

	let { data, children } = $props();

	// Sync data to userState immediately (works during SSR, unlike $effect.pre)
	untrack(() => syncUserState(data));

	setUserContext(userState);

	// Re-sync on client-side data changes (e.g. after invalidateAll)
	$effect.pre(() => {
		syncUserState(data);
	});

	let breadcrumbs = $derived(getBreadcrumbs(page.route.id || '/'));
	let currencySelectorOpen = $state(false);

	// Notification state
	let notificationPanelOpen = $state(false);
	let preferencesDialogOpen = $state(false);
	let unreadCount = $state(0);
	let notifications = $state<PaginatedNotifications>({
		data: [],
		total: 0,
		limit: 20,
		offset: 0,
		nextPage: null
	});
	let notificationsLoading = $state(false);
	let preferencesLoading = $state(false);
	let preferences = $state<NotificationPreference | null>(null);

	// Polling for unread count (client-side only, pauses when tab hidden)
	$effect(() => {
		if (!browser) return;
		fetchUnreadCount();
		const interval = setInterval(() => {
			if (!document.hidden) {
				fetchUnreadCount();
			}
		}, 60_000);
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				fetchUnreadCount();
			}
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			clearInterval(interval);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	async function fetchUnreadCount() {
		try {
			const response = await fetch('/api/notifications/unread-count');
			if (response.ok) {
				const result = await response.json();
				unreadCount = result.count;
			}
		} catch {
			// Silent fail for polling
		}
	}

	async function fetchNotifications(loadMore = false) {
		notificationsLoading = true;
		try {
			const offset = loadMore ? notifications.data.length : 0;
			const response = await fetch(`/api/notifications?limit=20&offset=${offset}`);
			if (!response.ok) {
				toast.error($t('notifications.loadError'));
				return;
			}
			const result: PaginatedNotifications = await response.json();
			if (loadMore) {
				notifications = {
					...result,
					data: [...notifications.data, ...result.data]
				};
			} else {
				notifications = result;
			}
		} catch {
			toast.error($t('notifications.loadError'));
		} finally {
			notificationsLoading = false;
		}
	}

	async function handleMarkAsRead(id: string) {
		try {
			const response = await fetch(`/api/notifications/${id}/read`, {
				method: 'PATCH'
			});
			if (response.ok) {
				notifications.data = notifications.data.map((n) =>
					n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
				);
				unreadCount = Math.max(0, unreadCount - 1);
			}
		} catch {
			// Silent fail
		}
	}

	async function handleMarkAllAsRead() {
		try {
			const response = await fetch('/api/notifications/read-all', {
				method: 'PATCH'
			});
			if (response.ok) {
				notifications.data = notifications.data.map((n) => ({
					...n,
					isRead: true,
					readAt: n.readAt || new Date().toISOString()
				}));
				unreadCount = 0;
				toast.success($t('notifications.markAllReadSuccess'));
			} else {
				toast.error($t('notifications.markAllReadError'));
			}
		} catch {
			toast.error($t('notifications.markAllReadError'));
		}
	}

	async function handleDeleteNotification(id: string) {
		try {
			const response = await fetch(`/api/notifications/${id}`, {
				method: 'DELETE'
			});
			if (response.ok) {
				const deleted = notifications.data.find((n) => n.id === id);
				notifications.data = notifications.data.filter((n) => n.id !== id);
				notifications.total = Math.max(0, notifications.total - 1);
				if (deleted && !deleted.isRead) {
					unreadCount = Math.max(0, unreadCount - 1);
				}
				toast.success($t('notifications.deleteSuccess'));
			} else {
				toast.error($t('notifications.deleteError'));
			}
		} catch {
			toast.error($t('notifications.deleteError'));
		}
	}

	function handleNotificationClick(notification: Notification) {
		if (notification.actionUrl) {
			notificationPanelOpen = false;
			goto(notification.actionUrl);
		}
	}

	function handleOpenPanel() {
		notificationPanelOpen = true;
		fetchNotifications();
	}

	function handleLoadMore() {
		fetchNotifications(true);
	}

	async function handleOpenPreferences() {
		preferencesDialogOpen = true;
		preferencesLoading = true;
		try {
			const response = await fetch('/api/notifications/preferences');
			if (response.ok) {
				preferences = await response.json();
			} else {
				toast.error($t('notifications.preferencesLoadError'));
			}
		} catch {
			toast.error($t('notifications.preferencesLoadError'));
		} finally {
			preferencesLoading = false;
		}
	}

	async function handleSavePreferences(prefs: UpdateNotificationPreference) {
		preferencesLoading = true;
		try {
			const response = await fetch('/api/notifications/preferences', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(prefs)
			});
			if (response.ok) {
				preferences = await response.json();
				toast.success($t('notifications.preferencesSaveSuccess'));
				preferencesDialogOpen = false;
			} else {
				toast.error($t('notifications.preferencesSaveError'));
			}
		} catch {
			toast.error($t('notifications.preferencesSaveError'));
		} finally {
			preferencesLoading = false;
		}
	}

	async function loadCurrencyRates(currencyCode: string) {
		try {
			const response = await fetch(`/api/currencies/${currencyCode}`);

			if (!response.ok) {
				throw new Error('Failed to fetch currency data');
			}

			const currencyData = await response.json();
			return currencyData;
		} catch {
			toast.error($t('currencies.loadCurrenciesError'));
		}
	}

	async function updateCurrencyCode(currencyCode: string) {
		try {
			const response = await fetch('/api/users', {
				method: 'PATCH',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					currencyCode
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update currency code');
			}

			const updatedUser = await response.json();
			userState.user = updatedUser;
			const currencyRates = await loadCurrencyRates(currencyCode);
			userState.currencyRates = currencyRates;
			toast.success($t('currencies.currencyUpdateSuccess'));
			currencySelectorOpen = false;
		} catch {
			toast.error($t('currencies.currencyUpdateError'));
		}
	}
</script>

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header
			class="flex h-16 shrink-0 items-center justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
		>
			<div class="flex items-center gap-2 px-4">
				<Sidebar.Trigger class="-ml-1" />
				<Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
				<Breadcrumb.Root>
					<Breadcrumb.List>
						{#each breadcrumbs as breadcrumb, index}
							{#if index > 0}
								<Breadcrumb.Separator />
							{/if}
							<Breadcrumb.Item>
								{#if index < breadcrumbs.length - 1}
									<Breadcrumb.Link href={breadcrumb.path}
										>{$t(`${breadcrumb.name}.title`)}</Breadcrumb.Link
									>
								{:else}
									<Breadcrumb.Page>{$t(`${breadcrumb.name}.title`)}</Breadcrumb.Page>
								{/if}
							</Breadcrumb.Item>
						{/each}
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</div>
			<div class="flex items-center gap-2 pr-4">
				<div class="ml-auto flex items-center gap-2">
					<div class="text-muted-foreground hidden text-xs sm:block">Currency:</div>
					<CurrencySelector
						bind:selectedCurrency={userState.user!.currencyCode}
						bind:open={currencySelectorOpen}
						onChange={updateCurrencyCode}
					/>
				</div>
				<NotificationBell {unreadCount} onclick={handleOpenPanel} />
				<Button class="mr-4" onclick={toggleMode} variant="outline" size="icon">
					<Sun class="h-5 w-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
					<Moon
						class="absolute h-5 w-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
					/>
					<span class="sr-only">{$t('header.toggleTheme')}</span>
				</Button>
			</div>
		</header>
		<div class="flex flex-1 flex-col gap-4 p-4 py-0">
			{@render children()}
			<Footer></Footer>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

<NotificationPanel
	bind:open={notificationPanelOpen}
	{notifications}
	loading={notificationsLoading}
	onMarkAsRead={handleMarkAsRead}
	onMarkAllAsRead={handleMarkAllAsRead}
	onDelete={handleDeleteNotification}
	onLoadMore={handleLoadMore}
	onOpenPreferences={handleOpenPreferences}
	onNotificationClick={handleNotificationClick}
/>

<NotificationPreferencesDialog
	bind:open={preferencesDialogOpen}
	{preferences}
	onSave={handleSavePreferences}
	loading={preferencesLoading}
/>
