<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { AlertTriangle, CheckCircle, Clock, Receipt } from '@lucide/svelte';
	import { t } from 'svelte-i18n';

	type Variant = 'overdue' | 'due' | 'paid' | 'total';

	type Props = {
		title: string;
		description: string;
		count: number;
		total: string;
		variant?: Variant;
	};

	let { title, description, count, total, variant = 'total' }: Props = $props();

	const iconClass: Record<Variant, string> = {
		overdue: 'h-4 w-4 text-red-600',
		due: 'h-4 w-4 text-amber-500',
		paid: 'h-4 w-4 text-green-600',
		total: 'text-muted-foreground h-4 w-4'
	};

	const totalClass: Record<Variant, string> = {
		overdue: 'text-red-600',
		due: 'text-amber-500',
		paid: 'text-green-600',
		total: ''
	};
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<Card.Title class="text-sm font-medium">{title}</Card.Title>
		{#if variant === 'overdue'}
			<AlertTriangle class={iconClass.overdue} />
		{:else if variant === 'due'}
			<Clock class={iconClass.due} />
		{:else if variant === 'paid'}
			<CheckCircle class={iconClass.paid} />
		{:else}
			<Receipt class={iconClass.total} />
		{/if}
	</Card.Header>
	<Card.Content>
		<div class={`text-xl font-bold break-words hyphens-auto lg:text-2xl ${totalClass[variant]}`}>
			{total}
		</div>
		<p class="text-muted-foreground mt-1 text-xs break-words">
			{$t('dashboard.billCount', { values: { count } })} &middot; {description}
		</p>
	</Card.Content>
</Card.Root>
