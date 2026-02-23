<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button, buttonVariants } from '$lib/components/ui/button';
	import Plus from '@lucide/svelte/icons/plus';
	import { t } from 'svelte-i18n';
	import * as Form from '$lib/components/ui/form';
	import { Input } from '$lib/components/ui/input';
	import { superForm } from 'sveltekit-superforms';
	import { zod4 } from 'sveltekit-superforms/adapters';
	import { createCategorySchema } from '$lib/schemas/category.schema';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import IconPicker from './icon-picker.svelte';
	import Label from './ui/label/label.svelte';
	import * as Select from '$lib/components/ui/select';

	import type { Category } from '$lib/types/category.types';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';

	let {
		data,
		categoryType = undefined,
		category = undefined,
		parentCategories = [],
		preSelectedParent = undefined,
		open = $bindable(false),
		onClose = () => {}
	}: {
		data: SuperValidated<Infer<typeof createCategorySchema>>;
		categoryType?: string;
		category?: Category;
		parentCategories?: Category[];
		preSelectedParent?: Category;
		open?: boolean;
		onClose?: () => void;
	} = $props();
	let selectedIcon = $state('');
	// svelte-ignore state_referenced_locally
	let selectedCategoryType = $state(categoryType);
	let selectedParentId = $state<string | undefined>(undefined);

	let selectedParentCategory = $derived(parentCategories.find((c) => c.id === selectedParentId));

	// svelte-ignore state_referenced_locally
	const form = superForm(data, {
		validators: zod4(createCategorySchema),
		onSubmit({ formData }) {
			formData.set('icon', selectedIcon);
			if (selectedParentId) {
				formData.set('parent', selectedParentId);
				// Inherit categoryType from parent
				const parentCat = parentCategories.find((c) => c.id === selectedParentId);
				if (parentCat) {
					formData.set('categoryType', parentCat.categoryType);
				}
			} else if (!categoryType) {
				formData.set('categoryType', selectedCategoryType || '');
			} else {
				formData.set('categoryType', categoryType);
			}
		},
		onUpdate({ form }) {
			if (form.valid) {
				open = false;
			}
		}
	});

	const { form: formData, enhance, isTainted, tainted, allErrors, delayed, reset } = form;
	let isEdit = $derived(!!category);

	// Determine if the submit button should be enabled
	let isFormValid = $derived(
		isTainted($tainted?.name) &&
			selectedIcon &&
			(selectedParentId || selectedCategoryType || categoryType) &&
			!$allErrors.length
	);

	$effect(() => {
		if (category) {
			$formData.id = category.id;
			$formData.name = category.name;
			selectedIcon = category.icon;
			selectedCategoryType = category.categoryType;
			selectedParentId = category.parent?.id ?? undefined;
		} else {
			reset();
		}
	});

	$effect(() => {
		if (preSelectedParent) {
			selectedParentId = preSelectedParent.id;
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(open: boolean) => {
		if (!open) {
			reset();
			onClose();
		}
		selectedIcon = '';
		selectedCategoryType = categoryType || '';
		selectedParentId = preSelectedParent?.id ?? undefined;
	}}
>
	{#if !categoryType}
		<Dialog.Trigger class={buttonVariants({ variant: 'default' })}>
			<Plus class="mr-2 h-4 w-4" />
			{$t('categories.addCategory')}
		</Dialog.Trigger>
	{:else}
		<Dialog.Trigger>
			{#snippet child({ props })}
				<div class="flex flex-col items-center space-y-2">
					<Button
						{...props}
						variant="outline"
						size="icon"
						class="h-16 w-16 rounded-full border-2 border-dashed text-blue-600 transition-transform hover:scale-105 hover:bg-blue-50 hover:text-blue-700"
						onclick={() => (open = true)}
					>
						<Plus class="h-6 w-6" />
					</Button>
					<div class="text-center">
						<p class="text-xs font-medium text-blue-600">{$t('categories.createNew')}</p>
						<p class="text-muted-foreground text-xs">{$t('categories.category')}</p>
					</div>
				</div>
			{/snippet}
		</Dialog.Trigger>
	{/if}
	<Dialog.Content escapeKeydownBehavior="ignore" interactOutsideBehavior="ignore">
		<Dialog.Header>
			<Dialog.Title>
				{#if isEdit}
					{$t('categories.editCategory')}
				{:else}
					{$t('categories.createNewCategory')}
				{/if}
			</Dialog.Title>
		</Dialog.Header>
		<form
			id="createCategoryForm"
			action="?/addCategory"
			method="POST"
			class="space-y-4"
			use:enhance
		>
			<input hidden name="id" value={$formData.id || ''} />
			<Form.Field {form} name="name">
				<Form.Control>
					{#snippet children({ props })}
						<Form.Label>{$t('categories.categoryName')}</Form.Label>
						<Input
							type="text"
							placeholder={$t('categories.categoryNamePlaceholder')}
							{...props}
							bind:value={$formData.name}
						/>
					{/snippet}
				</Form.Control>
				<Form.FieldErrors />
			</Form.Field>
			{#if !categoryType && parentCategories.length > 0}
				<div>
					<Label class="mb-2">{$t('categories.parentCategory')}</Label>
					<Select.Root type="single" bind:value={selectedParentId} name="parent">
						<Select.Trigger class="w-full">
							{selectedParentCategory ? selectedParentCategory.name : $t('categories.noParent')}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">{$t('categories.noParent')}</Select.Item>
							{#each parentCategories as parent (parent.id)}
								<Select.Item value={parent.id}>{parent.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
			{#if !categoryType && !selectedParentId}
				<Form.Field {form} name="categoryType">
					<Form.Control>
						{#snippet children({ props })}
							<Form.Label>{$t('categories.categoryTypeLabel')}</Form.Label>
							<Select.Root type="single" bind:value={selectedCategoryType} name={props.name}>
								<Select.Trigger class="w-full" {...props}>
									{selectedCategoryType
										? $t(`categories.categoryType.${selectedCategoryType}`)
										: $t('categories.categoryTypePlaceholder')}
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="INCOME">{$t('categories.categoryType.INCOME')}</Select.Item>
									<Select.Item value="EXPENSE">{$t('categories.categoryType.EXPENSE')}</Select.Item>
								</Select.Content>
							</Select.Root>
						{/snippet}
					</Form.Control>
				</Form.Field>
			{:else if selectedParentCategory}
				<div>
					<Label class="text-muted-foreground mb-2">{$t('categories.categoryTypeLabel')}</Label>
					<p class="text-sm">
						{$t(`categories.categoryType.${selectedParentCategory.categoryType}`)}
						<span class="text-muted-foreground text-xs">
							— inherited from {selectedParentCategory.name}
						</span>
					</p>
				</div>
			{/if}
			<div>
				<Label class="mb-2">{$t('categories.categoryIcon')}</Label>
				<IconPicker bind:icon={selectedIcon} />
			</div>
		</form>
		<Dialog.Footer>
			<Button
				class="mt-5 w-full"
				type="submit"
				form="createCategoryForm"
				disabled={$delayed || !isFormValid}
			>
				{#if $delayed}<LoaderCircle class="mr-1 animate-spin" />{/if}
				{#if isEdit}
					{$t('common.save')}
				{:else}
					{$t('categories.createCategory')}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
