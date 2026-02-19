<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants, type ButtonVariant } from '$lib/components/ui/button';
	import Plus from '@lucide/svelte/icons/plus';
	import { t } from 'svelte-i18n';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import Check from '@lucide/svelte/icons/check';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import SelectTransactionType from './select-transaction-type.svelte';
	import {
		createTransactionSchema,
		createTransferSchema,
		type CreateTransactionSchema,
		type CreateTransferSchema
	} from '$lib/schemas/transaction.schema';
	import CreateTransactionForm from './create-transaction-form.svelte';
	import type { Category } from '$lib/types/category.types';
	import { Badge } from '$lib/components/ui/badge';
	import CreateTransferForm from './create-transfer-form.svelte';
	import type { CreateCategorySchema } from '$lib/schemas/category.schema';
	import type { Account } from '$lib/types/account.types';
	import type { Transaction } from '$lib/types/transactions.types';
	import CategoryBadge from '../category-badge.svelte';
	import ChooseCategory from '../choose-category.svelte';

	interface Props {
		addTransactionForm: SuperValidated<CreateTransactionSchema>;
		addTransferForm: SuperValidated<CreateTransferSchema>;
		createCategoryForm: SuperValidated<CreateCategorySchema>;
		categories: Category[];
		accounts: Account[];
		buttonVariant?: ButtonVariant;
		transaction?: Transaction;
		open?: boolean;
		onClose?: () => void;
	}

	let {
		addTransactionForm,
		addTransferForm,
		createCategoryForm,
		categories,
		accounts,
		buttonVariant = 'default',
		transaction = undefined,
		open = $bindable(false),
		onClose = () => {}
	}: Props = $props();

	let transactionStep = $state(1);
	let categoryType = $state('');
	let category: Category | undefined = $state(undefined);
	let filteredCategories = $derived(
		categories.filter((c: Category) => c.categoryType === categoryType)
	);
	let isEdit = $derived(!!transaction);

	function goToNextStep() {
		if (categoryType === 'TRANSFER') {
			transactionStep = 3; // Skip to details for transfer
		} else {
			transactionStep += 1;
		}
	}

	function goToPreviousStep() {
		if (categoryType === 'TRANSFER') {
			transactionStep = 1; // Go back to type selection for transfer
		} else {
			transactionStep -= 1;
		}
	}

	const form = superForm(addTransactionForm, {
		validators: zod4(createTransactionSchema),
		onSubmit({ formData, cancel }) {
			if (!category) {
				cancel();
				return;
			}
			formData.set('category', category.id);
		},
		onUpdate({ form }) {
			if (form.valid) {
				resetDialog();
				open = false;
			}
		}
	});

	const { form: formData, enhance, isTainted, tainted, allErrors, delayed, reset } = form;

	const transferForm = superForm(addTransferForm, {
		validators: zod4(createTransferSchema),
		onUpdate({ form }) {
			if (form.valid) {
				resetDialog();
				open = false;
			}
		}
	});

	const {
		form: transferFormData,
		enhance: transferEnhance,
		isTainted: transferIsTainted,
		tainted: transferTainted,
		allErrors: transferAllErrors,
		delayed: transferDelayed,
		reset: transferReset
	} = transferForm;

	function resetDialog() {
		transactionStep = 1;
		categoryType = '';
		category = undefined;
		reset();
		transferReset();
	}

	$effect(() => {
		if (transaction) {
			transactionStep = 3;
			const transactioncategoryType = transaction.category?.categoryType || 'TRANSFER';
			category = transaction.category;
			categoryType = transactioncategoryType;
			if (transactioncategoryType === 'TRANSFER') {
				$transferFormData.id = transaction.id;
				$transferFormData.amount = Math.abs(transaction.amount);
				// date should be formatted as string with the form '2025-07-04'
				$transferFormData.date = transaction.date.split('T')[0];
				$transferFormData.description = transaction.description;
				$transferFormData.notes = transaction.notes;
				// if the transaction is a transfer, the origin account is the account where the money comes from
				if (transaction.amount < 0) {
					$transferFormData.account = transaction.transfer.account.id;
					$transferFormData.originAccount = transaction.account.id;
				} else {
					$transferFormData.account = transaction.account.id;
					$transferFormData.originAccount = transaction.transfer.account.id;
				}
			} else {
				$formData.id = transaction.id;
				$formData.amount = Math.abs(transaction.amount);
				// date should be formatted as string with the form '2025-07-04'
				$formData.date = transaction.date.split('T')[0];
				$formData.description = transaction.description;
				$formData.notes = transaction.notes;
				$formData.account = transaction.account.id;
				$formData.category = transaction.category?.id;
			}
		} else {
			resetDialog();
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(open: boolean) => {
		if (!open) {
			resetDialog();
			onClose();
		}
	}}
>
	<Dialog.Trigger class={buttonVariants({ variant: buttonVariant })}>
		<Plus class="mr-2 h-4 w-4" />
		{$t('transactions.addTransaction')}
	</Dialog.Trigger>
	<Dialog.Content escapeKeydownBehavior="ignore" interactOutsideBehavior="ignore">
		<Dialog.Header>
			<Dialog.Title>
				{#if isEdit}
					{$t('transactions.editTransaction')}
				{:else}
					{$t('transactions.addTransaction')}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{$t('transactions.stepOf', { values: { step: transactionStep, totalSteps: 3 } })}
				{transactionStep === 1
					? $t('transactions.selectType')
					: transactionStep === 2
						? $t('transactions.chooseCategory')
						: $t('transactions.transactionDetails')}
			</Dialog.Description>
		</Dialog.Header>
		<div class="mb-6 flex items-center justify-between">
			{#each [1, 2, 3] as step}
				<div class="flex items-center">
					<div
						class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
							step < transactionStep
								? 'bg-green-500 text-white'
								: step === transactionStep
									? 'bg-blue-500 text-white'
									: 'bg-gray-200 text-gray-600'
						}`}
					>
						{#if step < transactionStep}
							<Check class="h-4 w-4" />
						{:else}
							{step}
						{/if}
					</div>
					{#if step < 3}
						<div
							class={`mx-2 h-1 w-12 ${step < transactionStep ? 'bg-green-500' : 'bg-gray-200'}`}
						></div>
					{/if}
				</div>
			{/each}
		</div>
		{#if transactionStep === 1}
			<SelectTransactionType bind:type={categoryType} />
		{:else if transactionStep === 2}
			<ChooseCategory
				{categoryType}
				{createCategoryForm}
				categories={filteredCategories}
				bind:category
			/>
		{:else}
			<div class="space-y-4">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-medium">{$t('transactions.transactionDetails')}</h3>
					<div class="flex items-center gap-2">
						<Badge
							variant={categoryType === 'INCOME'
								? 'default'
								: categoryType === 'EXPENSE'
									? 'destructive'
									: 'secondary'}
						>
							{$t(`categories.categoryType.${categoryType}`).toUpperCase()}
						</Badge>
						{#if category}
							<CategoryBadge {category} />
						{/if}
					</div>
				</div>
				{#if categoryType === 'TRANSFER'}
					<CreateTransferForm
						form={transferForm}
						bind:formData={$transferFormData}
						enhance={transferEnhance}
						{accounts}
					/>
				{:else}
					<CreateTransactionForm {form} bind:formData={$formData} {enhance} {accounts} />
				{/if}
			</div>
		{/if}
		<Dialog.Footer>
			<div class={`flex w-full pt-4 ${transactionStep > 1 ? 'justify-between' : 'justify-end'}`}>
				{#if transactionStep > 1}
					<Button variant="outline" class="flex items-center gap-2" onclick={goToPreviousStep}>
						<ArrowLeft class="h-4 w-4" />
						{$t('common.back')}
					</Button>
				{/if}
				{#if transactionStep < 3}
					<Button
						class="flex items-center gap-2"
						disabled={(transactionStep === 1 && !categoryType) ||
							(transactionStep === 2 && !category)}
						onclick={goToNextStep}
					>
						{$t('common.next')}
						<ArrowRight class="h-4 w-4" />
					</Button>
				{:else if categoryType === 'TRANSFER'}
					<Button
						class="flex items-center gap-2"
						form="addTransferForm"
						type="submit"
						disabled={$transferDelayed ||
							!transferIsTainted($transferTainted?.account) ||
							!transferIsTainted($transferTainted?.originAccount) ||
							!transferIsTainted($transferTainted?.amount) ||
							!transferIsTainted($transferTainted?.date) ||
							!transferIsTainted($transferTainted?.description) ||
							!!$transferAllErrors.length}
					>
						{#if $transferDelayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
						{$t('common.save')}
					</Button>
				{:else}
					<Button
						class="flex items-center gap-2"
						form="addTransactionForm"
						type="submit"
						disabled={$delayed ||
							!isTainted($tainted?.account) ||
							!isTainted($tainted?.amount) ||
							!isTainted($tainted?.date) ||
							!isTainted($tainted?.description) ||
							!!$allErrors.length}
					>
						{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
						{$t('common.save')}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
