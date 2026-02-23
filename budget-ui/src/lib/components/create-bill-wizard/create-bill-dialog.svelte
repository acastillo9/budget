<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { ArrowLeft, ArrowRight, Check, LoaderCircle, Plus } from '@lucide/svelte';
	import { buttonVariants } from '../ui/button';
	import { t } from 'svelte-i18n';
	import Button from '../ui/button/button.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { createBillSchema } from '$lib/schemas/bill.schema';
	import { createCategorySchema } from '$lib/schemas/category.schema';
	import type { Category } from '$lib/types/category.types';
	import type { Account } from '$lib/types/account.types';
	import type { Bill } from '$lib/types/bill.types';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import ChooseCategory from '../choose-category.svelte';
	import Badge from '../ui/badge/badge.svelte';
	import CategoryBadge from '../category-badge.svelte';
	import CreateBillForm from './create-bill-form.svelte';

	let {
		addBillForm,
		createCategoryForm,
		categories,
		accounts,
		bill = undefined,
		open = $bindable(false),
		onClose = () => {}
	}: {
		addBillForm: SuperValidated<Infer<typeof createBillSchema>>;
		createCategoryForm: SuperValidated<Infer<typeof createCategorySchema>>;
		categories: Category[];
		accounts: Account[];
		bill?: Bill;
		open?: boolean;
		onClose?: () => void;
	} = $props();

	let billStep = $state(1);
	let isEdit = $derived(!!bill);
	let categoryType = $state('EXPENSE');
	let category: Category | undefined = $state(undefined);
	let filteredCategories = $derived(
		categories.filter((c: Category) => c.categoryType === categoryType)
	);

	// svelte-ignore state_referenced_locally
	const form = superForm(addBillForm, {
		validators: zod4(createBillSchema),
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

	function resetDialog() {
		billStep = 1;
		categoryType = 'EXPENSE';
		category = undefined;
		reset();
	}

	function goToPreviousStep() {
		billStep -= 1;
	}

	function goToNextStep() {
		billStep += 1;
	}

	$effect(() => {
		if (bill) {
			billStep = 2;
			formData.set({
				id: bill.id,
				targetDate: bill.targetDate.split('T')[0],
				name: bill.name,
				amount: bill.amount,
				dueDate: bill.dueDate.split('T')[0],
				endDate: bill.endDate ? bill.endDate.split('T')[0] : '',
				frequency: bill.frequency as unknown as
					| 'ONCE'
					| 'DAILY'
					| 'WEEKLY'
					| 'BIWEEKLY'
					| 'MONTHLY'
					| 'YEARLY',
				account: bill.account.id,
				applyToFuture: bill.applyToFuture || false
			});
			categoryType = bill.category.categoryType;
			category = bill.category;
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
	<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
		<Plus class="mr-2 h-4 w-4" />
		{$t('bills.addBill')}
	</Dialog.Trigger>
	<Dialog.Content
		escapeKeydownBehavior="ignore"
		interactOutsideBehavior="ignore"
		class="max-h-full overflow-y-auto"
	>
		<Dialog.Header>
			<Dialog.Title>
				{#if isEdit}
					{$t('bills.editBill')}
				{:else}
					{$t('bills.addBill')}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{$t('bills.stepOf', { values: { step: billStep, totalSteps: 2 } })}
				{billStep === 1 ? $t('bills.chooseCategory') : $t('bills.billDetails')}
			</Dialog.Description>
		</Dialog.Header>
		<div class="mb-6 flex items-center justify-between">
			{#each [1, 2] as step}
				<div class="flex items-center">
					<div
						class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
							step < billStep
								? 'bg-green-500 text-white'
								: step === billStep
									? 'bg-blue-500 text-white'
									: 'bg-gray-200 text-gray-600'
						}`}
					>
						{#if step < billStep}
							<Check class="h-4 w-4" />
						{:else}
							{step}
						{/if}
					</div>
					{#if step < 2}
						<div class={`mx-2 h-1 w-12 ${step < billStep ? 'bg-green-500' : 'bg-gray-200'}`}></div>
					{/if}
				</div>
			{/each}
		</div>
		{#if billStep === 1}
			<ChooseCategory
				{categoryType}
				{createCategoryForm}
				categories={filteredCategories}
				bind:category
			/>
		{:else}
			<div class="space-y-4">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-medium">{$t('bills.billDetails')}</h3>
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
				<CreateBillForm {form} bind:formData={$formData} {enhance} {accounts} {isEdit} />
			</div>
		{/if}
		<Dialog.Footer>
			<div class={`flex w-full pt-4 ${billStep > 1 ? 'justify-between' : 'justify-end'}`}>
				{#if billStep > 1}
					<Button variant="outline" class="flex items-center gap-2" onclick={goToPreviousStep}>
						<ArrowLeft class="h-4 w-4" />
						{$t('common.back')}
					</Button>
				{/if}
				{#if billStep < 2}
					<Button
						class="flex items-center gap-2"
						disabled={billStep === 1 && !category}
						onclick={goToNextStep}
					>
						{$t('common.next')}
						<ArrowRight class="h-4 w-4" />
					</Button>
				{:else}
					<Button
						class="flex items-center gap-2"
						form="addBillForm"
						type="submit"
						disabled={$delayed ||
							!isTainted($tainted?.account) ||
							!isTainted($tainted?.amount) ||
							!isTainted($tainted?.dueDate) ||
							!isTainted($tainted?.name) ||
							!isTainted($tainted?.frequency) ||
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
