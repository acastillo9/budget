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
	import { userState } from '$lib/states/user.svelte';
	import { toast } from 'svelte-sonner';

	let { data, children } = $props();

	userState.user = data.user;
	userState.currencyRates = data.currencyRates;
	setUserContext(userState);

	let breadcrumbs = $derived(getBreadcrumbs(page.route.id || '/'));
	let currencySelectorOpen = $state(false);

	async function loadCurrencyRates(currencyCode: string) {
		try {
			const response = await fetch(`/api/currencies/${currencyCode}`);

			if (!response.ok) {
				throw new Error('Failed to fetch currency data');
			}

			const data = await response.json();
			return data;
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
