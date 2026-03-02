<script lang="ts">
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { cn } from '$lib/utils';
	import { locale, t } from 'svelte-i18n';
	import {
		type CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate
	} from '@internationalized/date';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import SearchIcon from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import type { Category } from '$lib/types/category.types';
	import type { Account } from '$lib/types/account.types';
	import { iconMap } from '$lib/utils/icons';
	import { formatAccountName } from '$lib/utils/account';

	let {
		categories,
		accounts,
		dateFrom,
		dateTo,
		categoryId,
		accountId,
		search,
		onFilterChange
	}: {
		categories: Category[];
		accounts: Account[];
		dateFrom?: string;
		dateTo?: string;
		categoryId?: string;
		accountId?: string;
		search?: string;
		onFilterChange: (filters: {
			dateFrom?: string;
			dateTo?: string;
			categoryId?: string;
			accountId?: string;
			search?: string;
		}) => void;
	} = $props();

	const df = new DateFormatter($locale || 'en-US', {
		dateStyle: 'long'
	});

	const dateFromValue: CalendarDate | undefined = $derived(
		dateFrom ? parseDate(dateFrom) : undefined
	);
	const dateToValue: CalendarDate | undefined = $derived(dateTo ? parseDate(dateTo) : undefined);

	let dateFromContentRef = $state<HTMLElement | null>(null);
	let dateToContentRef = $state<HTMLElement | null>(null);

	let searchInput = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	const searchValue = $derived(search || '');
	$effect(() => {
		searchInput = searchValue;
	});

	function handleSearchInput(e: Event) {
		const value = (e.target as HTMLInputElement).value;
		searchInput = value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			onFilterChange({
				dateFrom,
				dateTo,
				categoryId,
				accountId,
				search: value || undefined
			});
		}, 300);
	}

	const hasActiveFilters = $derived(dateFrom || dateTo || categoryId || accountId || search);

	function getCategoryLabel(catId: string): string {
		for (const parent of categories) {
			if (parent.id === catId) return parent.name;
			if (parent.children) {
				for (const child of parent.children) {
					if (child.id === catId) return child.name;
				}
			}
		}
		return '';
	}
</script>

<div class="flex flex-wrap items-end gap-3">
	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{$t('transactions.filters.search')}</span>
		<div class="relative w-[200px]">
			<SearchIcon class="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
			<Input
				type="text"
				placeholder={$t('transactions.filters.search')}
				value={searchInput}
				oninput={handleSearchInput}
				class="pl-9"
			/>
		</div>
	</div>

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{$t('transactions.filters.dateFrom')}</span>
		<Popover.Root>
			<Popover.Trigger
				class={cn(
					buttonVariants({
						variant: 'outline',
						class: 'w-[200px] justify-start text-left font-normal'
					}),
					!dateFromValue && 'text-muted-foreground'
				)}
			>
				<CalendarIcon />
				{dateFromValue
					? df.format(dateFromValue.toDate(getLocalTimeZone()))
					: $t('transactions.filters.pickDate')}
			</Popover.Trigger>
			<Popover.Content bind:ref={dateFromContentRef} class="w-auto p-0">
				<Calendar
					type="single"
					locale={$locale || 'en-US'}
					value={dateFromValue}
					onValueChange={(v) => {
						onFilterChange({
							dateFrom: v?.toString(),
							dateTo,
							categoryId,
							accountId,
							search
						});
					}}
				/>
			</Popover.Content>
		</Popover.Root>
	</div>

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{$t('transactions.filters.dateTo')}</span>
		<Popover.Root>
			<Popover.Trigger
				class={cn(
					buttonVariants({
						variant: 'outline',
						class: 'w-[200px] justify-start text-left font-normal'
					}),
					!dateToValue && 'text-muted-foreground'
				)}
			>
				<CalendarIcon />
				{dateToValue
					? df.format(dateToValue.toDate(getLocalTimeZone()))
					: $t('transactions.filters.pickDate')}
			</Popover.Trigger>
			<Popover.Content bind:ref={dateToContentRef} class="w-auto p-0">
				<Calendar
					type="single"
					locale={$locale || 'en-US'}
					value={dateToValue}
					onValueChange={(v) => {
						onFilterChange({
							dateFrom,
							dateTo: v?.toString(),
							categoryId,
							accountId,
							search
						});
					}}
				/>
			</Popover.Content>
		</Popover.Root>
	</div>

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{$t('transactions.filters.category')}</span>
		<Select.Root
			type="single"
			value={categoryId}
			onValueChange={(v) => {
				onFilterChange({
					dateFrom,
					dateTo,
					categoryId: v === '' ? undefined : v,
					accountId,
					search
				});
			}}
		>
			<Select.Trigger class="w-[200px]">
				{categoryId ? getCategoryLabel(categoryId) : $t('transactions.filters.allCategories')}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">{$t('transactions.filters.allCategories')}</Select.Item>
				<Select.Separator />
				{#each categories as parent (parent.id)}
					<Select.Group>
						<Select.Item value={parent.id} class="flex items-center gap-2 font-semibold">
							{#if parent.icon && iconMap[parent.icon]}
								{@const Icon = iconMap[parent.icon]}
								<Icon class="mr-2 size-4" />
							{/if}
							{parent.name}
						</Select.Item>
						{#if parent.children && parent.children.length > 0}
							{#each parent.children as child (child.id)}
								<Select.Item value={child.id} class="flex items-center gap-2 pl-6">
									{#if child.icon && iconMap[child.icon]}
										{@const ChildIcon = iconMap[child.icon]}
										<ChildIcon class="mr-2 size-4" />
									{/if}
									{child.name}
								</Select.Item>
							{/each}
						{/if}
					</Select.Group>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<div class="flex flex-col gap-1.5">
		<span class="text-sm font-medium">{$t('transactions.filters.account')}</span>
		<Select.Root
			type="single"
			value={accountId}
			onValueChange={(v) => {
				onFilterChange({
					dateFrom,
					dateTo,
					categoryId,
					accountId: v === '' ? undefined : v,
					search
				});
			}}
		>
			<Select.Trigger class="w-[200px]">
				{accountId
					? formatAccountName(accounts.find((a) => a.id === accountId)!)
					: $t('transactions.filters.allAccounts')}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="">{$t('transactions.filters.allAccounts')}</Select.Item>
				<Select.Separator />
				{#each accounts as account (account.id)}
					<Select.Item value={account.id}>
						{formatAccountName(account)}
					</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	{#if hasActiveFilters}
		<Button variant="ghost" size="sm" onclick={() => onFilterChange({})} class="h-9">
			<X class="size-4" />
			{$t('transactions.filters.clearFilters')}
		</Button>
	{/if}
</div>
