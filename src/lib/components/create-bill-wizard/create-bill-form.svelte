<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import * as Select from '$lib/components/ui/select';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';

	import type { Account } from '$lib/types/account.types';
	import { formatAccountName } from '$lib/utils/account';
	import { locale, t } from 'svelte-i18n';
	import { cn } from '$lib/utils';
	import { buttonVariants } from '../ui/button';
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';
	import { AlertCircle, Calendar1, CalendarIcon } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import type { SuperForm, Infer } from 'sveltekit-superforms';
	import { createBillSchema } from '$lib/schemas/bill.schema';

	type BillFormData = Infer<typeof createBillSchema>;

	let {
		form,
		formData = $bindable(),
		enhance,
		accounts,
		isEdit = false
	}: {
		form: SuperForm<BillFormData>;
		formData: BillFormData;
		enhance: SuperForm<BillFormData>['enhance'];
		accounts: Account[];
		isEdit?: boolean;
	} = $props();

	const df = new DateFormatter($locale || 'en-US', {
		dateStyle: 'long'
	});
	formData.dueDate = formData.dueDate || today(getLocalTimeZone()).toString();
	let dueDate: CalendarDate | undefined = $state(parseDate(formData.dueDate));
	let contentRef = $state<HTMLElement | null>(null);
	formData.endDate = formData.endDate || '';
	let endDate: CalendarDate | undefined = $state(
		formData.endDate ? parseDate(formData.endDate) : undefined
	);
	let endDateContentRef = $state<HTMLElement | null>(null);
</script>

<form id="addBillForm" class="space-y-4" method="POST" action="?/addBill" use:enhance>
	<input hidden name="id" value={formData.id || ''} />
	<input hidden name="targetDate" value={formData.targetDate || ''} />
	{#if isEdit}
		<div class="space-y-3">
			<Card.Root class="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-sm">
						<Calendar1 class="h-4 w-4" />
						{$t('bills.editScope')}
					</Card.Title>
					<Card.Description class="text-xs">{$t('bills.editScopeDescription')}</Card.Description>
				</Card.Header>
				<Card.Content class="pt-0">
					<Form.Field
						{form}
						name="applyToFuture"
						class="flex flex-row items-center justify-between"
					>
						<Form.Control>
							{#snippet children({ props })}
								<div class="mb-0 flex flex-col gap-1">
									<Form.Label
										>{formData.applyToFuture
											? $t('bills.editScopeSeriesLabel')
											: $t('bills.editScopeSingleLabel')}</Form.Label
									>
									<Form.Description
										>{formData.applyToFuture
											? $t('bills.editScopeSeriesDescription')
											: $t('bills.editScopeSingleDescription')}</Form.Description
									>
								</div>
								<Switch {...props} aria-readonly bind:checked={formData.applyToFuture} />
							{/snippet}
						</Form.Control>
					</Form.Field>
				</Card.Content>
			</Card.Root>
			{#if formData.applyToFuture}
				<Alert.Root>
					<AlertCircle class="h-4 w-4" />
					<Alert.Description class="text-xs">{$t('bills.editScopeAlert')}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>
	{/if}
	<Form.Field {form} name="name">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.billName')}</Form.Label>
				<Input
					type="text"
					placeholder={$t('bills.billName')}
					{...props}
					bind:value={formData.name}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="amount">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.billAmount')}</Form.Label>
				<Input
					type="number"
					placeholder={$t('bills.billAmountPlaceholder')}
					{...props}
					bind:value={formData.amount}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="dueDate">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.dueDate')}</Form.Label>
				<Popover.Root>
					<Popover.Trigger
						class={cn(
							buttonVariants({
								variant: 'outline',
								class: 'w-full justify-start text-left font-normal'
							}),
							!dueDate && 'text-muted-foreground'
						)}
						{...props}
					>
						<CalendarIcon />
						{dueDate ? df.format(dueDate.toDate(getLocalTimeZone())) : $t('common.pickADate')}
					</Popover.Trigger>
					<Popover.Content bind:ref={contentRef} class="w-auto p-0">
						<Calendar
							type="single"
							locale={$locale || 'en-US'}
							value={dueDate}
							onValueChange={(v) => {
								if (v) {
									formData.dueDate = v.toString();
									dueDate = parseDate(formData.dueDate);
								} else {
									formData.dueDate = '';
									dueDate = undefined;
								}
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<input hidden value={formData.dueDate} name={props.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="endDate">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.endDate')}</Form.Label>
				<Popover.Root>
					<Popover.Trigger
						class={cn(
							buttonVariants({
								variant: 'outline',
								class: 'w-full justify-start text-left font-normal'
							}),
							!endDate && 'text-muted-foreground'
						)}
						disabled={(isEdit && !formData.applyToFuture) || formData.frequency === 'ONCE'}
						{...props}
					>
						<CalendarIcon />
						{endDate ? df.format(endDate.toDate(getLocalTimeZone())) : $t('common.pickADate')}
					</Popover.Trigger>
					<Popover.Content bind:ref={endDateContentRef} class="w-auto p-0">
						<Calendar
							type="single"
							locale={$locale || 'en-US'}
							value={endDate}
							onValueChange={(v) => {
								if (v) {
									formData.endDate = v.toString();
									endDate = parseDate(formData.endDate);
								} else {
									formData.endDate = '';
									endDate = undefined;
								}
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<input hidden value={formData.endDate} name={props.name} />
			{/snippet}
		</Form.Control>
		{#if (isEdit && !formData.applyToFuture) || formData.frequency === 'ONCE'}
			<p class="text-muted-foreground mt-1 text-xs">{$t('bills.endDateAlert')}</p>
		{/if}
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="frequency">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.billFrequencyLabel')}</Form.Label>
				<Select.Root
					type="single"
					bind:value={formData.frequency}
					name={props.name}
					disabled={isEdit && !formData.applyToFuture}
					onValueChange={(value) => {
						if (value === 'ONCE') {
							formData.endDate = '';
							endDate = undefined;
						}
					}}
				>
					<Select.Trigger class="w-full" {...props}>
						{formData.frequency
							? $t(`bills.billFrequency.${formData.frequency}`)
							: $t('bills.billFrequencyPlaceholder')}
					</Select.Trigger>
					<Select.Content>
						{#each ['ONCE', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'] as freq}
							<Select.Item value={freq}>{$t(`bills.billFrequency.${freq}`)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		{#if isEdit && !formData.applyToFuture}
			<input hidden value={formData.frequency} name="frequency" />
			<p class="text-muted-foreground mt-1 text-xs">{$t('bills.billFrequencyAlert')}</p>
		{/if}
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="account">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('bills.account')}</Form.Label>
				<Select.Root type="single" bind:value={formData.account} name={props.name}>
					<Select.Trigger class="w-full" {...props}>
						{formData.account
							? formatAccountName(
									accounts.find((account: Account) => account.id === formData.account)!
								)
							: $t('bills.accountPlaceholder')}
					</Select.Trigger>
					<Select.Content>
						{#each accounts as account (account.id)}
							<Select.Item value={account.id}>{formatAccountName(account)}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
</form>
