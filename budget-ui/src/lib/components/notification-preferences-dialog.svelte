<script lang="ts">
	import type {
		NotificationPreference,
		NotificationType,
		UpdateNotificationPreference
	} from '$lib/types/notification.types';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { t } from 'svelte-i18n';
	import { updateNotificationPreferencesSchema } from '$lib/schemas/notification-preferences.schema';
	import { toast } from 'svelte-sonner';
	import { currencies } from '$lib/utils/currency';

	interface Props {
		open: boolean;
		preferences: NotificationPreference | null;
		onSave: (prefs: UpdateNotificationPreference) => void;
		loading: boolean;
	}

	let { open = $bindable(false), preferences, onSave, loading }: Props = $props();

	const notificationTypes: NotificationType[] = [
		'BILL_OVERDUE',
		'BILL_DUE_SOON',
		'BUDGET_THRESHOLD',
		'BUDGET_EXCEEDED',
		'LOW_BALANCE',
		'LARGE_TRANSACTION',
		'RECURRING_BILL_ENDING',
		'WORKSPACE_INVITATION',
		'MONTHLY_SUMMARY'
	];

	// Local form state, initialized from preferences
	let channels = $state<Record<string, { inApp: boolean; email: boolean }>>({});
	let budgetThresholdPercent = $state(80);
	let largeTransactionAmounts = $state<Record<string, number>>({ USD: 500, COP: 2000000 });
	let lowBalanceAmounts = $state<Record<string, number>>({ USD: 100, COP: 500000 });
	let billDueSoonDays = $state(3);
	let quietHoursEnabled = $state(false);
	let quietHoursStart = $state('22:00');
	let quietHoursEnd = $state('08:00');
	let quietHoursTimezone = $state('UTC');

	// Currency selector for thresholds
	let selectedCurrency = $state(currencies[0]?.code ?? 'USD');
	let showCurrencySelector = $derived(currencies.length > 1);

	// Reset form when preferences change
	$effect(() => {
		if (preferences) {
			// Extract only known notification type channels to avoid Mongoose _id fields
			const cleanChannels: Record<string, { inApp: boolean; email: boolean }> = {};
			for (const type of notificationTypes) {
				if (preferences.channels[type]) {
					cleanChannels[type] = {
						inApp: preferences.channels[type].inApp,
						email: preferences.channels[type].email
					};
				}
			}
			channels = cleanChannels;
			budgetThresholdPercent = preferences.budgetThresholdPercent;
			largeTransactionAmounts = { ...preferences.largeTransactionAmounts };
			lowBalanceAmounts = { ...preferences.lowBalanceAmounts };
			billDueSoonDays = preferences.billDueSoonDays;
			quietHoursEnabled = preferences.quietHoursEnabled;
			quietHoursStart = preferences.quietHoursStart;
			quietHoursEnd = preferences.quietHoursEnd;
			quietHoursTimezone = preferences.quietHoursTimezone;
		}
	});

	function handleSave() {
		const data: UpdateNotificationPreference = {
			channels,
			budgetThresholdPercent,
			largeTransactionAmounts,
			lowBalanceAmounts,
			billDueSoonDays,
			quietHoursEnabled,
			quietHoursStart,
			quietHoursEnd,
			quietHoursTimezone
		};

		const result = updateNotificationPreferencesSchema.safeParse(data);
		if (!result.success) {
			toast.error($t('notifications.preferencesSaveError'));
			return;
		}

		onSave(data);
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[85vh] overflow-y-auto sm:max-w-lg"
		escapeKeydownBehavior="ignore"
		interactOutsideBehavior="ignore"
	>
		<Dialog.Header>
			<Dialog.Title>{$t('notifications.preferences')}</Dialog.Title>
			<Dialog.Description>{$t('notifications.preferencesDescription')}</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Channels Section -->
			<div>
				<h4 class="mb-3 text-sm font-medium">{$t('notifications.channels')}</h4>
				<div class="space-y-3">
					<div
						class="text-muted-foreground mb-2 grid grid-cols-[1fr_auto_auto] items-center gap-4 text-xs"
					>
						<span></span>
						<span class="w-14 text-center">{$t('notifications.inApp')}</span>
						<span class="w-14 text-center">{$t('notifications.email')}</span>
					</div>
					{#each notificationTypes as type (type)}
						<div class="grid grid-cols-[1fr_auto_auto] items-center gap-4">
							<Label class="text-sm">{$t(`notifications.eventTypes.${type}`)}</Label>
							<div class="flex w-14 justify-center">
								<Switch
									checked={channels[type]?.inApp ?? true}
									onCheckedChange={(checked) => {
										if (!channels[type]) channels[type] = { inApp: true, email: false };
										channels[type].inApp = checked;
									}}
								/>
							</div>
							<div class="flex w-14 justify-center">
								<Switch
									checked={channels[type]?.email ?? false}
									onCheckedChange={(checked) => {
										if (!channels[type]) channels[type] = { inApp: true, email: false };
										channels[type].email = checked;
									}}
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<Separator />

			<!-- Thresholds Section -->
			<div>
				<h4 class="mb-3 text-sm font-medium">{$t('notifications.thresholds')}</h4>
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="budget-threshold">{$t('notifications.budgetThresholdPercent')}</Label>
						<Input
							id="budget-threshold"
							type="number"
							min={1}
							max={100}
							bind:value={budgetThresholdPercent}
						/>
					</div>

					{#if showCurrencySelector}
						<div class="space-y-2">
							<Label>{$t('notifications.currency')}</Label>
							<div class="flex gap-1" role="radiogroup" aria-label={$t('notifications.currency')}>
								{#each currencies as currency (currency.code)}
									<button
										type="button"
										role="radio"
										aria-checked={selectedCurrency === currency.code}
										class="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors
											{selectedCurrency === currency.code
											? 'bg-primary text-primary-foreground border-primary'
											: 'bg-background text-muted-foreground hover:bg-muted border-input'}"
										onclick={() => (selectedCurrency = currency.code)}
									>
										<span>{currency.flag}</span>
										<span>{currency.code}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<Label for="large-transaction-{selectedCurrency}">
							{$t('notifications.largeTransactionAmount')}
						</Label>
						<Input
							id="large-transaction-{selectedCurrency}"
							type="number"
							min={0}
							value={largeTransactionAmounts[selectedCurrency] ?? 0}
							oninput={(e) => {
								largeTransactionAmounts[selectedCurrency] = Number(
									(e.target as HTMLInputElement).value
								);
							}}
						/>
					</div>
					<div class="space-y-2">
						<Label for="low-balance-{selectedCurrency}">
							{$t('notifications.lowBalanceAmount')}
						</Label>
						<Input
							id="low-balance-{selectedCurrency}"
							type="number"
							min={0}
							value={lowBalanceAmounts[selectedCurrency] ?? 0}
							oninput={(e) => {
								lowBalanceAmounts[selectedCurrency] = Number((e.target as HTMLInputElement).value);
							}}
						/>
					</div>
					<div class="space-y-2">
						<Label for="bill-due-soon">{$t('notifications.billDueSoonDays')}</Label>
						<Input id="bill-due-soon" type="number" min={1} max={30} bind:value={billDueSoonDays} />
					</div>
				</div>
			</div>

			<Separator />

			<!-- Quiet Hours Section -->
			<div>
				<h4 class="mb-1 text-sm font-medium">{$t('notifications.quietHours')}</h4>
				<p class="text-muted-foreground mb-3 text-xs">
					{$t('notifications.quietHoursDescription')}
				</p>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<Label for="quiet-hours-enabled">{$t('notifications.quietHoursEnabled')}</Label>
						<Switch bind:checked={quietHoursEnabled} />
					</div>
					{#if quietHoursEnabled}
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<Label for="quiet-start">{$t('notifications.quietHoursStart')}</Label>
								<Input id="quiet-start" type="time" bind:value={quietHoursStart} />
							</div>
							<div class="space-y-2">
								<Label for="quiet-end">{$t('notifications.quietHoursEnd')}</Label>
								<Input id="quiet-end" type="time" bind:value={quietHoursEnd} />
							</div>
						</div>
						<div class="space-y-2">
							<Label for="quiet-timezone">{$t('notifications.quietHoursTimezone')}</Label>
							<Input
								id="quiet-timezone"
								type="text"
								placeholder="UTC"
								bind:value={quietHoursTimezone}
							/>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>{$t('notifications.cancel')}</Button>
			<Button onclick={handleSave} disabled={loading}>
				{#if loading}<LoaderCircle class="mr-1 animate-spin" />{/if}
				{$t('notifications.save')}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
