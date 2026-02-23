<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Form from '$lib/components/ui/form';
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeft, ArrowRight, Check, LoaderCircle, Plus } from '@lucide/svelte';
	import { buttonVariants } from './ui/button';
	import { t } from 'svelte-i18n';
	import Button from './ui/button/button.svelte';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { createBudgetSchema } from '$lib/schemas/budget.schema';
	import { createCategorySchema } from '$lib/schemas/category.schema';
	import type { Category } from '$lib/types/category.types';
	import type { BudgetProgress } from '$lib/types/budget.types';
	import CategoryBadge from './category-badge.svelte';
	import ChooseCategory from './choose-category.svelte';
	import { cn } from '$lib/utils';
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';
	import { CalendarIcon } from '@lucide/svelte';
	import { locale } from 'svelte-i18n';
	import { invalidateAll } from '$app/navigation';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';

	let {
		addBudgetForm,
		createCategoryForm,
		categories,
		budget = undefined,
		open = $bindable(false),
		onClose = () => {}
	}: {
		addBudgetForm: SuperValidated<Infer<typeof createBudgetSchema>>;
		createCategoryForm: SuperValidated<Infer<typeof createCategorySchema>>;
		categories: Category[];
		budget?: BudgetProgress | undefined;
		open?: boolean;
		onClose?: () => void;
	} = $props();

	let budgetStep = $state(1);
	let isEdit = $derived(!!budget);
	let selectedCategories = $state<Category[]>([]);

	const expenseCategories = $derived(
		categories.filter((c: Category) => c.categoryType === 'EXPENSE')
	);

	const df = new DateFormatter($locale || 'en-US', { dateStyle: 'long' });

	const form = superForm(addBudgetForm, {
		validators: zod4(createBudgetSchema),
		onSubmit({ formData, cancel }) {
			if (selectedCategories.length === 0) {
				cancel();
				return;
			}
			// Inject selected category IDs into FormData
			formData.delete('categories');
			selectedCategories.forEach((cat) => formData.append('categories', cat.id));
		},
		onUpdate({ form }) {
			if (form.valid) {
				resetDialog();
				open = false;
				invalidateAll();
			}
		}
	});

	const { form: formData, enhance, isTainted, tainted, allErrors, delayed, reset } = form;

	// Calendar state
	let startDate: CalendarDate | undefined = $state(undefined);
	let endDate: CalendarDate | undefined = $state(undefined);
	let startDateContentRef = $state<HTMLElement | null>(null);
	let endDateContentRef = $state<HTMLElement | null>(null);

	// Keep $formData.categories in sync with selectedCategories
	$effect(() => {
		$formData.categories = selectedCategories.map((c) => c.id);
	});

	function resetDialog() {
		budgetStep = 1;
		selectedCategories = [];
		startDate = undefined;
		endDate = undefined;
		reset();
	}

	function goToPreviousStep() {
		budgetStep -= 1;
	}

	function goToNextStep() {
		budgetStep += 1;
	}

	$effect(() => {
		if (budget) {
			budgetStep = 2;
			const sd = budget.periodStart
				? budget.periodStart.split('T')[0]
				: today(getLocalTimeZone()).toString();
			startDate = parseDate(sd);
			endDate = undefined;

			formData.set({
				id: budget.budgetId,
				name: budget.name ?? '',
				amount: budget.amount,
				period: budget.period as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
				startDate: sd,
				endDate: '',
				categories: budget.categories.map((c) => c.id)
			});
			selectedCategories = budget.categories;
		} else {
			resetDialog();
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen: boolean) => {
		if (!isOpen) {
			resetDialog();
			onClose();
		}
	}}
>
	<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
		<Plus class="mr-2 h-4 w-4" />
		{$t('budgets.addBudget')}
	</Dialog.Trigger>
	<Dialog.Content
		escapeKeydownBehavior="ignore"
		interactOutsideBehavior="ignore"
		class="max-h-full overflow-y-auto"
	>
		<Dialog.Header>
			<Dialog.Title>
				{#if isEdit}
					{$t('budgets.editBudget')}
				{:else}
					{$t('budgets.addBudget')}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				{$t('budgets.stepOf', { values: { step: budgetStep, totalSteps: 2 } })}
				{budgetStep === 1 ? $t('budgets.chooseCategories') : $t('budgets.budgetDetails')}
			</Dialog.Description>
		</Dialog.Header>

		<!-- Step indicators -->
		<div class="mb-6 flex items-center justify-between">
			{#each [1, 2] as step}
				<div class="flex items-center">
					<div
						class={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
							step < budgetStep
								? 'bg-green-500 text-white'
								: step === budgetStep
									? 'bg-blue-500 text-white'
									: 'bg-gray-200 text-gray-600'
						}`}
					>
						{#if step < budgetStep}
							<Check class="h-4 w-4" />
						{:else}
							{step}
						{/if}
					</div>
					{#if step < 2}
						<div
							class={`mx-2 h-1 w-12 ${step < budgetStep ? 'bg-green-500' : 'bg-gray-200'}`}
						></div>
					{/if}
				</div>
			{/each}
		</div>

		{#if budgetStep === 1}
			<!-- Step 1: Multi-select category picker -->
			<ChooseCategory
				categoryType="EXPENSE"
				{createCategoryForm}
				categories={expenseCategories}
				multiSelect
				bind:selectedCategories
			/>
			{#if selectedCategories.length > 0}
				<div class="flex flex-wrap gap-2 border-t pt-2">
					{#each selectedCategories as cat (cat.id)}
						<CategoryBadge category={cat} size="sm" />
					{/each}
				</div>
			{/if}
		{:else}
			<!-- Step 2: Budget details form -->
			<div class="space-y-4">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="font-medium">{$t('budgets.budgetDetails')}</h3>
					<div class="flex flex-wrap items-center gap-1">
						{#each selectedCategories.slice(0, 3) as cat (cat.id)}
							<CategoryBadge category={cat} size="sm" />
						{/each}
						{#if selectedCategories.length > 3}
							<span class="text-muted-foreground text-xs">+{selectedCategories.length - 3}</span>
						{/if}
					</div>
				</div>
				<form id="addBudgetForm" class="space-y-4" method="POST" action="?/addBudget" use:enhance>
					<input hidden name="id" value={$formData.id || ''} />
					<!-- Categories are injected via onSubmit -->

					<Form.Field {form} name="name">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('budgets.budgetName')}</Form.Label>
								<Input
									type="text"
									placeholder={$t('budgets.budgetNamePlaceholder')}
									{...props}
									bind:value={$formData.name}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="amount">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('budgets.budgetAmount')}</Form.Label>
								<Input
									type="number"
									step="0.01"
									placeholder={$t('budgets.budgetAmountPlaceholder')}
									{...props}
									bind:value={$formData.amount}
								/>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="period">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('budgets.period')}</Form.Label>
								<Select.Root type="single" bind:value={$formData.period} name={props.name}>
									<Select.Trigger class="w-full" {...props}>
										{$formData.period
											? $t(`budgets.periods.${$formData.period}`)
											: $t('budgets.periodPlaceholder')}
									</Select.Trigger>
									<Select.Content>
										{#each ['WEEKLY', 'MONTHLY', 'YEARLY'] as p}
											<Select.Item value={p}>{$t(`budgets.periods.${p}`)}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="startDate">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('budgets.startDate')}</Form.Label>
								<Popover.Root>
									<Popover.Trigger
										class={cn(
											buttonVariants({
												variant: 'outline',
												class: 'w-full justify-start text-left font-normal'
											}),
											!startDate && 'text-muted-foreground'
										)}
										{...props}
									>
										<CalendarIcon />
										{startDate
											? df.format(startDate.toDate(getLocalTimeZone()))
											: $t('common.pickADate')}
									</Popover.Trigger>
									<Popover.Content bind:ref={startDateContentRef} class="w-auto p-0">
										<Calendar
											type="single"
											locale={$locale || 'en-US'}
											value={startDate}
											onValueChange={(v) => {
												if (v) {
													$formData.startDate = v.toString();
													startDate = parseDate($formData.startDate);
												} else {
													$formData.startDate = '';
													startDate = undefined;
												}
											}}
										/>
									</Popover.Content>
								</Popover.Root>
								<input hidden value={$formData.startDate} name={props.name} />
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>

					<Form.Field {form} name="endDate">
						<Form.Control>
							{#snippet children({ props })}
								<Form.Label>{$t('budgets.endDate')}</Form.Label>
								<Popover.Root>
									<Popover.Trigger
										class={cn(
											buttonVariants({
												variant: 'outline',
												class: 'w-full justify-start text-left font-normal'
											}),
											!endDate && 'text-muted-foreground'
										)}
										{...props}
									>
										<CalendarIcon />
										{endDate
											? df.format(endDate.toDate(getLocalTimeZone()))
											: $t('common.pickADate')}
									</Popover.Trigger>
									<Popover.Content bind:ref={endDateContentRef} class="w-auto p-0">
										<Calendar
											type="single"
											locale={$locale || 'en-US'}
											value={endDate}
											onValueChange={(v) => {
												if (v) {
													$formData.endDate = v.toString();
													endDate = parseDate($formData.endDate);
												} else {
													$formData.endDate = '';
													endDate = undefined;
												}
											}}
										/>
									</Popover.Content>
								</Popover.Root>
								<input hidden value={$formData.endDate} name={props.name} />
							{/snippet}
						</Form.Control>
						<Form.FieldErrors />
					</Form.Field>
				</form>
			</div>
		{/if}

		<Dialog.Footer>
			<div class={`flex w-full pt-4 ${budgetStep > 1 ? 'justify-between' : 'justify-end'}`}>
				{#if budgetStep > 1}
					<Button variant="outline" class="flex items-center gap-2" onclick={goToPreviousStep}>
						<ArrowLeft class="h-4 w-4" />
						{$t('common.back')}
					</Button>
				{/if}
				{#if budgetStep < 2}
					<Button
						class="flex items-center gap-2"
						disabled={selectedCategories.length === 0}
						onclick={goToNextStep}
					>
						{$t('common.next')}
						<ArrowRight class="h-4 w-4" />
					</Button>
				{:else}
					<Button
						class="flex items-center gap-2"
						form="addBudgetForm"
						type="submit"
						disabled={$delayed ||
							!isTainted($tainted?.amount) ||
							!isTainted($tainted?.period) ||
							!isTainted($tainted?.startDate) ||
							selectedCategories.length === 0 ||
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
