<script lang="ts">
	import * as Form from '$lib/components/ui/form';
	import * as Select from '$lib/components/ui/select';
	import { Input } from '$lib/components/ui/input';
	import { locale, t } from 'svelte-i18n';
	import type { Account } from '$lib/types/account.types';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { formatAccountName } from '$lib/utils/account';
	import type { SuperForm, Infer } from 'sveltekit-superforms';
	import { createTransactionSchema } from '$lib/schemas/transaction.schema';

	type TransactionFormData = Infer<typeof createTransactionSchema>;

	let {
		form,
		formData = $bindable(),
		enhance,
		accounts
	}: {
		form: SuperForm<TransactionFormData>;
		formData: TransactionFormData;
		enhance: SuperForm<TransactionFormData>['enhance'];
		accounts: Account[];
	} = $props();

	const df = new DateFormatter($locale || 'en-US', {
		dateStyle: 'long'
	});
	formData.date = formData.date || today(getLocalTimeZone()).toString();
	let date: CalendarDate | undefined = $state(parseDate(formData.date));
	let contentRef = $state<HTMLElement | null>(null);
</script>

<form id="addTransactionForm" class="space-y-4" method="POST" action="?/addTransaction" use:enhance>
	<input hidden name="id" value={formData.id || ''} />
	<Form.Field {form} name="account">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.account')}</Form.Label>
				<Select.Root type="single" bind:value={formData.account} name={props.name}>
					<Select.Trigger class="w-full" {...props}>
						{formData.account
							? formatAccountName(
									accounts.find((account: Account) => account.id === formData.account)!
								)
							: $t('transactions.accountPlaceholder')}
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
	<Form.Field {form} name="amount">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.amount')}</Form.Label>
				<Input
					type="number"
					placeholder={$t('transactions.amountPlaceholder')}
					{...props}
					bind:value={formData.amount}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="date">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.date')}</Form.Label>
				<Popover.Root>
					<Popover.Trigger
						class={cn(
							buttonVariants({
								variant: 'outline',
								class: 'w-full justify-start text-left font-normal'
							}),
							!date && 'text-muted-foreground'
						)}
						{...props}
					>
						<CalendarIcon />
						{date ? df.format(date.toDate(getLocalTimeZone())) : $t('transactions.pickADate')}
					</Popover.Trigger>
					<Popover.Content bind:ref={contentRef} class="w-auto p-0">
						<Calendar
							type="single"
							locale={$locale || 'en-US'}
							value={date}
							onValueChange={(v) => {
								if (v) {
									formData.date = v.toString();
									date = parseDate(formData.date);
								} else {
									formData.date = '';
									date = undefined;
								}
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<input hidden value={formData.date} name={props.name} />
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="description">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.descriptionField')}</Form.Label>
				<Input
					type="text"
					placeholder={$t('transactions.descriptionPlaceholder')}
					{...props}
					bind:value={formData.description}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
	<Form.Field {form} name="notes">
		<Form.Control>
			{#snippet children({ props })}
				<Form.Label>{$t('transactions.notes')}</Form.Label>
				<Textarea
					placeholder={$t('transactions.notesPlaceholder')}
					{...props}
					bind:value={formData.notes}
				/>
			{/snippet}
		</Form.Control>
		<Form.FieldErrors />
	</Form.Field>
</form>
