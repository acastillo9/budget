<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { DollarSign, TrendingDown, TrendingUp } from '@lucide/svelte';

	type Props = {
		title: string;
		description: string;
		total: number | string;
		variant?: 'income' | 'expense';
	};

	let { title, description, total, variant }: Props = $props();
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<Card.Title class="text-sm font-medium">{title}</Card.Title>
		{#if variant === 'income'}
			<TrendingUp class="h-4 w-4 text-green-600" />
		{:else if variant === 'expense'}
			<TrendingDown class="h-4 w-4 text-red-600" />
		{:else}
			<DollarSign class="text-muted-foreground h-4 w-4" />
		{/if}
	</Card.Header>
	<Card.Content>
		<div
			class={`text-xl font-bold break-words hyphens-auto lg:text-2xl ${variant && variant === 'income' ? 'text-green-600' : variant === 'expense' ? 'text-red-600' : ''}`}
		>
			{total}
		</div>
		<p class="text-muted-foreground mt-1 text-xs break-words">
			{description}
		</p>
	</Card.Content>
</Card.Root>
